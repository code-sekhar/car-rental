import "dotenv/config";
import { db } from "../lib/server/db";
import { retryEmailOutbox } from "../lib/server/mail";
async function main() {
  const now = new Date();
  const [limits, sessions, tokens, holds] = await db.$transaction([
    db.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.session.deleteMany({ where: { expires: { lt: now } } }),
    db.authToken.deleteMany({
      where: { expiresAt: { lt: new Date(now.getTime() - 7 * 86400000) } },
    }),
    db.booking.updateMany({
      where: { status: "PENDING_PAYMENT", holdExpiresAt: { lt: now } },
      data: { status: "EXPIRED" },
    }),
  ]);
  const attemptedEmails = await retryEmailOutbox();
  console.log(
    JSON.stringify({
      event: "maintenance_completed",
      expiredLimits: limits.count,
      expiredSessions: sessions.count,
      expiredTokens: tokens.count,
      expiredHolds: holds.count,
      attemptedEmails,
    }),
  );
}
main()
  .catch(() => {
    console.error(
      "[maintenance] Failed; consult database and mail configuration",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
