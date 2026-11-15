import "server-only";
import { mkdir, writeFile, chmod } from "node:fs/promises";
import { resolve } from "node:path";
import nodemailer from "nodemailer-smtp";
import { db } from "./db";
import { decryptPrivate } from "./security";
export function mailConfiguration() {
  const transport = process.env.MAIL_TRANSPORT;
  if (transport === "file" && process.env.ALLOW_LOCAL_MAIL === "true")
    return "file";
  if (transport === "smtp" && process.env.SMTP_URL && process.env.EMAIL_FROM)
    return "smtp";
  throw new Error(
    "Configure SMTP before enabling account email delivery; local mailbox requires explicit ALLOW_LOCAL_MAIL=true.",
  );
}
export async function deliverEmail(id: string) {
  const record = await db.emailOutbox.findUnique({ where: { id } });
  if (!record || record.status === "SENT") return;
  try {
    const text = decryptPrivate(record.encryptedBody);
    if (mailConfiguration() === "file") {
      const directory = resolve(
        /* turbopackIgnore: true */ process.env.LOCAL_MAIL_DIRECTORY ??
          ".local/mail",
      );
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await chmod(directory, 0o700);
      await writeFile(
        resolve(/* turbopackIgnore: true */ directory, `${id}.json`),
        JSON.stringify(
          { to: record.recipient, subject: record.subject, text },
          null,
          2,
        ),
        { mode: 0o600 },
      );
    } else
      await nodemailer.createTransport(process.env.SMTP_URL!).sendMail({
        from: process.env.EMAIL_FROM,
        to: record.recipient,
        subject: record.subject,
        text,
      });
    await db.emailOutbox.update({
      where: { id },
      data: {
        status: "SENT",
        attempts: { increment: 1 },
        sentAt: new Date(),
        lastError: null,
      },
    });
  } catch {
    await db.emailOutbox.update({
      where: { id },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
        lastError: "DELIVERY_FAILED",
      },
    });
    console.error("[mail] Delivery failed; queued message retained for retry", {
      id,
    });
  }
}
export async function retryEmailOutbox() {
  const records = await db.emailOutbox.findMany({
    where: { status: { in: ["PENDING", "FAILED"] }, attempts: { lt: 8 } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 25,
  });
  for (const record of records) await deliverEmail(record.id);
  return records.length;
}
