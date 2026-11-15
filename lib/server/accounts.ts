import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import {
  registrationSchema,
  emailRequestSchema,
  resetSchema,
  verifySchema,
  loginSchema,
} from "@/lib/auth/validation";
import {
  newToken,
  hashToken,
  hashPassword,
  verifyPassword,
  encryptPrivate,
  rateLimit,
  InputError,
} from "./security";
import { deliverEmail, mailConfiguration } from "./mail";
function appUrl() {
  const url = new URL(process.env.APP_URL ?? "");
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("Invalid APP_URL");
  return url.origin;
}
async function queueToken(
  tx: Prisma.TransactionClient,
  user: { id: string; email: string },
  purpose: "VERIFY_EMAIL" | "RESET_PASSWORD",
) {
  const token = newToken();
  const expiresAt = new Date(
    Date.now() + (purpose === "VERIFY_EMAIL" ? 24 * 60 : 30) * 60000,
  );
  await tx.authToken.updateMany({
    where: { userId: user.id, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });
  await tx.authToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), purpose, expiresAt },
  });
  const path = purpose === "VERIFY_EMAIL" ? "verify-email" : "reset-password";
  const subject =
    purpose === "VERIFY_EMAIL"
      ? "Verify your Veltrix Rentals email"
      : "Reset your Veltrix Rentals password";
  const text = `${subject}\n\n${appUrl()}/${path}?token=${token}\n\nThis link expires ${purpose === "VERIFY_EMAIL" ? "in 24 hours" : "in 30 minutes"}. If you did not request this, ignore this email.`;
  return tx.emailOutbox.create({
    data: {
      recipient: user.email,
      subject,
      encryptedBody: encryptPrivate(text),
    },
  });
}
export async function registerAccount(input: unknown) {
  const data = registrationSchema.parse(input);
  await rateLimit("register", data.email, 3, 3600);
  await rateLimit("register-global", "all", 100, 3600);
  mailConfiguration();
  const encoded = await hashPassword(data.password);
  let mailId: string | undefined;
  try {
    mailId = await db.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email: data.email },
      });
      if (existing) return undefined;
      const user = await tx.user.create({
        data: { name: data.name, email: data.email, passwordHash: encoded },
      });
      const mail = await queueToken(tx, user, "VERIFY_EMAIL");
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "ACCOUNT_REGISTERED",
          entityType: "User",
          entityId: user.id,
        },
      });
      await tx.notification.create({
        data: {
          userId: user.id,
          title: "Welcome to Veltrix Rentals",
          body: "Your account has been created. Verify your email to sign in.",
        },
      });
      return mail.id;
    });
  } catch (error) {
    if (!(
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ))
      throw error;
  }
  if (mailId) await deliverEmail(mailId);
}
export async function requestAccountEmail(
  input: unknown,
  purpose: "VERIFY_EMAIL" | "RESET_PASSWORD",
) {
  const { email } = emailRequestSchema.parse(input);
  await rateLimit(purpose, email, 3, 3600);
  await rateLimit(`${purpose}-global`, "all", 100, 3600);
  mailConfiguration();
  const mailId = await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { email } });
    if (
      !user ||
      user.disabledAt ||
      (purpose === "VERIFY_EMAIL" && user.emailVerified) ||
      (purpose === "RESET_PASSWORD" && !user.passwordHash)
    )
      return;
    return (await queueToken(tx, user, purpose)).id;
  });
  if (mailId) await deliverEmail(mailId);
}
export async function verifyEmail(input: unknown) {
  const { token } = verifySchema.parse(input);
  await rateLimit("verify-token", hashToken(token), 8, 900);
  await db.$transaction(async (tx) => {
    const entry = await tx.authToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!entry || entry.purpose !== "VERIFY_EMAIL")
      throw new InputError("This verification link is invalid or has expired.");
    const consumed = await tx.authToken.updateMany({
      where: { id: entry.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1)
      throw new InputError("This verification link is invalid or has expired.");
    const user = await tx.user.findUniqueOrThrow({
      where: { id: entry.userId },
    });
    if (user.disabledAt) throw new InputError("This account is unavailable.");
    await tx.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "EMAIL_VERIFIED",
        entityType: "User",
        entityId: user.id,
      },
    });
  });
}
export async function resetPassword(input: unknown) {
  const { token, password } = resetSchema.parse(input);
  await rateLimit("reset-token", hashToken(token), 5, 900);
  const encoded = await hashPassword(password);
  await db.$transaction(async (tx) => {
    const entry = await tx.authToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!entry || entry.purpose !== "RESET_PASSWORD")
      throw new InputError("This reset link is invalid or has expired.");
    const consumed = await tx.authToken.updateMany({
      where: { id: entry.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1)
      throw new InputError("This reset link is invalid or has expired.");
    const user = await tx.user.findUniqueOrThrow({
      where: { id: entry.userId },
    });
    if (user.disabledAt) throw new InputError("This account is unavailable.");
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash: encoded },
    });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.authToken.updateMany({
      where: { userId: user.id, purpose: "RESET_PASSWORD", usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "PASSWORD_RESET",
        entityType: "User",
        entityId: user.id,
      },
    });
  });
}
// A cached dummy hash gives nonexistent users the same expensive verification path.
let dummy: Promise<string> | undefined;
export async function authenticateCredentials(input: unknown) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;
  await rateLimit("login", email, 8, 900);
  await rateLimit("login-global", "all", 300, 900);
  const user = await db.user.findUnique({ where: { email } });
  const encoded =
    user?.passwordHash ?? (await (dummy ??= hashPassword(newToken())));
  const valid = await verifyPassword(encoded, password);
  if (!valid || !user?.passwordHash || !user.emailVerified || user.disabledAt)
    return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    emailVerified: user.emailVerified,
  };
}
