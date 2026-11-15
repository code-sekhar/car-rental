import "server-only";
import {
  createHash,
  createHmac,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { db } from "./db";
export function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32)
    throw new Error("AUTH_SECRET must contain at least 32 random characters.");
  return value;
}
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const newToken = () => randomBytes(32).toString("hex");
export const hashPassword = (value: string) =>
  hash(value, {
    algorithm: 2 /* Argon2id */,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  });
export const verifyPassword = (encoded: string, value: string) =>
  verify(encoded, value);
export class InputError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function rateLimit(
  scope: string,
  identifier: string,
  limit: number,
  seconds: number,
) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const key = createHmac("sha256", secret())
    .update(`${scope}:${identifier}:${bucket}`)
    .digest("hex");
  const record = await db.rateLimit.upsert({
    where: { key },
    create: {
      key,
      count: 1,
      expiresAt: new Date((bucket + 1) * seconds * 1000),
    },
    update: { count: { increment: 1 } },
  });
  if (record.count > limit)
    throw new InputError("Too many attempts. Please try again later.", 429);
}
const encryptionKey = () =>
  createHash("sha256").update(`veltrix-private-mail:${secret()}`).digest();
export function encryptPrivate(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data]
    .map((b) => b.toString("base64url"))
    .join(".");
}
export function decryptPrivate(value: string) {
  const [iv, tag, data] = value
    .split(".")
    .map((v) => Buffer.from(v, "base64url"));
  const cipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8");
}
