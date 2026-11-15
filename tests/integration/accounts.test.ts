import { afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { db } from "../../lib/server/db";
import { accountInput } from "../../lib/server/http";
import {
  registerAccount,
  verifyEmail,
  resetPassword,
  requestAccountEmail,
  authenticateCredentials,
} from "../../lib/server/accounts";
import {
  hashToken,
  rateLimit,
  newToken,
  encryptPrivate,
  decryptPrivate,
} from "../../lib/server/security";
const email = `integration-${randomUUID()}@example.test`;
const password = "IntegrationPassword2026";
async function mailToken() {
  const mail = await db.emailOutbox.findFirstOrThrow({
    where: { recipient: email },
    orderBy: { createdAt: "desc" },
  });
  const file = JSON.parse(
    await readFile(
      resolve(process.env.LOCAL_MAIL_DIRECTORY!, `${mail.id}.json`),
      "utf8",
    ),
  );
  const match = file.text.match(/token=([a-f0-9]{64})/);
  if (!match)
    throw new Error("Private mailbox did not contain the expected link");
  return match[1] as string;
}
afterAll(async () => {
  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    await db.booking.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  }
  await db.emailOutbox.deleteMany({ where: { recipient: email } });
  await db.$disconnect();
});
describe("real PostgreSQL account lifecycle", () => {
  it("creates a customer, hashes the password and requires verification", async () => {
    await registerAccount({ name: "Integration Driver", email, password });
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    expect(user.role).toBe("CUSTOMER");
    expect(user.passwordHash?.startsWith("$argon2id$")).toBe(true);
    expect(user.passwordHash === password).toBe(false);
    expect(user.emailVerified).toBeNull();
    expect(await authenticateCredentials({ email, password })).toBeNull();
    const mail = await db.emailOutbox.findFirstOrThrow({
      where: { recipient: email },
    });
    expect(mail.status).toBe("SENT");
    expect(mail.encryptedBody.includes("token=")).toBe(false);
  });
  it("consumes a verification token once and authenticates only a valid password", async () => {
    const token = await mailToken();
    await verifyEmail({ token });
    await expect(verifyEmail({ token })).rejects.toThrow(/invalid|expired/);
    expect((await authenticateCredentials({ email, password }))?.email).toBe(
      email,
    );
    expect(
      await authenticateCredentials({
        email,
        password: "IncorrectPassword2026",
      }),
    ).toBeNull();
  });
  it("does not overwrite existing accounts during duplicate registration", async () => {
    await registerAccount({
      name: "Other Name",
      email,
      password: "DifferentPassword2026",
    });
    expect((await db.user.findUniqueOrThrow({ where: { email } })).name).toBe(
      "Integration Driver",
    );
  });
  it("resets a password, revokes database sessions and rejects token replay", async () => {
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    await db.session.create({
      data: {
        userId: user.id,
        sessionToken: hashToken(newToken()),
        expires: new Date(Date.now() + 3600000),
      },
    });
    await requestAccountEmail({ email }, "RESET_PASSWORD");
    const token = await mailToken();
    const next = "NewIntegrationPassword2026";
    await resetPassword({ token, password: next });
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
    await expect(resetPassword({ token, password: next })).rejects.toThrow(
      /invalid|expired/,
    );
    expect((await authenticateCredentials({ email, password: next }))?.id).toBe(
      user.id,
    );
  });
  it("rejects an expired recovery token", async () => {
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    const token = newToken();
    await db.authToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        purpose: "RESET_PASSWORD",
        expiresAt: new Date(Date.now() - 10000),
      },
    });
    await expect(
      resetPassword({ token, password: "ExpiredPassword2026" }),
    ).rejects.toThrow(/invalid|expired/);
  });
  it("enforces an atomic distributed rate limit", async () => {
    const id = randomUUID();
    const attempts = await Promise.allSettled(
      [1, 2, 3, 4].map(() => rateLimit("concurrency-test", id, 2, 900)),
    );
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(2);
    expect(attempts.filter((a) => a.status === "rejected")).toHaveLength(2);
  });
  it("limits repeated credential attempts for the same account", async () => {
    const unknown = `limited-${randomUUID()}@example.test`;
    for (let i = 0; i < 8; i++)
      expect(
        await authenticateCredentials({
          email: unknown,
          password: "IncorrectPassword2026",
        }),
      ).toBeNull();
    await expect(
      authenticateCredentials({
        email: unknown,
        password: "IncorrectPassword2026",
      }),
    ).rejects.toMatchObject({ status: 429 });
  });
  it("authenticates encrypted outbox content and detects tampering", () => {
    const encrypted = encryptPrivate("private test content");
    expect(decryptPrivate(encrypted)).toBe("private test content");
    const parts = encrypted.split(".");
    parts[2] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptPrivate(parts.join("."))).toThrow();
  });
  it("prevents concurrent overlapping confirmed reservations at the database boundary", async () => {
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    const vehicle = await db.vehicle.findFirstOrThrow();
    const start = new Date("2035-01-01T10:00:00Z"),
      end = new Date("2035-01-03T10:00:00Z");
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        db.booking.create({
          data: {
            reference: randomUUID(),
            idempotencyKey: randomUUID(),
            userId: user.id,
            vehicleId: vehicle.id,
            pickupLocationId: vehicle.locationId,
            returnLocationId: vehicle.locationId,
            pickupAt: start,
            returnAt: end,
            status: "CONFIRMED",
          },
        }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  });
  it("bounds streamed account input even without Content-Length", async () => {
    const origin = new URL(process.env.APP_URL!).origin;
    const request = new Request(`${origin}/api/account/register`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: "x".repeat(9000),
    });
    await expect(accountInput(request)).rejects.toMatchObject({ status: 413 });
  });
  it("rejects partial location coordinates", async () => {
    await expect(
      db.rentalLocation.create({
        data: {
          name: `invalid-${randomUUID()}`,
          address: "Test",
          city: "Test",
          countryCode: "US",
          timeZone: "UTC",
          latitude: 20,
        },
      }),
    ).rejects.toThrow();
  });
});
