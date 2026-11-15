# Database and authentication milestone

## Interrupted-session audit

The workspace has no Git repository, so `git status` and `git log` cannot supply a diff/history. The audit found dependencies, `prisma/schema.prisma`, `prisma.config.ts` and `scripts/setup-local-db.mjs`, but no `.env`, `.local` cluster, migrations, seed script or working auth. The original TypeScript checks and nine tests passed; lint reported one unused import, which was fixed.

The system PostgreSQL 18 cluster remains on port 5432. It was not altered. A separate OS-user-owned cluster lives in ignored `.local/postgres`, listens only on 127.0.0.1:55432, and uses SCRAM authentication for network connections. The application role is not a superuser and cannot create databases/roles. Generated credentials are in a mode-0600 ignored `.env`. Setup preserves an existing `.env` and refuses to reset an existing application role if its credentials are missing.

## Local commands

```bash
npm ci
npm run db:setup:local
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:status
npm run dev
```

The setup helper requires local PostgreSQL binaries; it defaults to `/usr/lib/postgresql/18/bin`. Override `POSTGRES_BIN` for another local installation. It is a development convenience, not a production dependency. Providers use their PostgreSQL connection string directly.

The development and test databases are `veltrix_development` and `veltrix_test`. Both migrations have been executed against both databases. Seeding is explicitly gated by `DEMO_SEED=true` and a development/demo/test database name; it preserves existing users/passwords and non-demo inventory. Twelve demo vehicles, three locations, brands/categories/images, configurable extras, insurance and two dedicated demo accounts are stored in PostgreSQL.

| Local dedicated demo account | Password            | Role     |
| ---------------------------- | ------------------- | -------- |
| `customer@veltrix.test`      | `VeltrixDemo!2026`  | CUSTOMER |
| `admin@veltrix.test`         | `VeltrixAdmin!2026` | ADMIN    |

These are deliberately public demo credentials, not production credentials. Do not seed them into a real customer database. Later administrative account provisioning should use a private verified workflow.

## Schema and migrations

`202611150001_foundation` creates normalized users/accounts/sessions, tokens/rate limits/private email outbox, vehicles/brands/categories/images/features/locations/availability, extras/insurance, bookings/drivers/extras/price snapshots, payments/events/refunds/coupons, reviews/favorites/notifications/addresses/audit logs. It adds monetary/range/rating checks and the `Booking_no_overlapping_reservations` GiST exclusion constraint for half-open reserved periods in PENDING_PAYMENT/CONFIRMED/ACTIVE states.

`202611150002_catalog_integrity` adds stored homepage merchandising fields and tightens nullable-coordinate/coupon constraints. Applied migrations were preserved; changes were added as a follow-up migration.

The database client is server-only and uses Prisma 7.10.1 with the PostgreSQL driver adapter. Pool size defaults to five connections. The server catalog/detail/home repository reads PostgreSQL; the old fixture module is used only by the seed script. Public inventory can be cached; private session/account data is not publicly cached. Prisma generation runs before production builds.

## Account workflows

- Registration validates strict input and cannot accept a client-provided role. Passwords use Argon2id. The user, verification-token hash, encrypted outbox entry, welcome notification and audit entry are committed together.
- Credentials login validates on the server, requires verified email, checks disabled state and applies database-backed fixed-window account/global limits. Unknown users perform a dummy password verification.
- Email verification and recovery use 32-byte random tokens stored only as SHA-256 hashes. Verification expires after 24 hours; reset expires after 30 minutes. Atomic conditional updates prevent token replay/concurrent consumption.
- Auth.js Credentials uses encrypted JWT cookies plus the hashed database registry. Password reset revokes all sessions. Logout revokes the active session. Protected requests recheck the database; browser tests retain an old cookie after reset and verify it receives 401.
- Google OAuth is disabled without both credentials. When configured, it requires Google's verified-email claim and keeps Auth.js's default account-linking protection. It is implemented but not externally verified without credentials.
- Account mutations require the configured same-origin request; Auth.js credential endpoints use its CSRF protection. Input size is bounded, error output is sanitized, tokens/passwords are not logged, and encrypted outbox files are excluded from deployment tracing.
- `/dashboard` shows the authenticated user's profile, their bookings and notifications. `/admin` and `/api/admin/overview` enforce fresh administrator role checks. Overview counts are real DB counts; full customer/admin operations remain future work.

SMTP is provided through a separately versioned `nodemailer-smtp` npm alias to Nodemailer 10.5. Auth.js's old optional email-provider peer is not installed because that provider is unused. This avoids retaining the vulnerable old Nodemailer branch. The SMTP interface is implemented; external delivery is not claimed verified.

## Tests

```bash
npm test
npm run test:integration
npm run build
npx playwright install chromium
npm run test:e2e
```

Integration and browser suites require `TEST_DATABASE_URL` ending in `_test`, deploy migrations and seed that database, and never truncate/reset the development database. Their generated accounts and draft booking fixtures are removed after tests. Failure traces and local test mail remain ignored/private; they can contain synthetic account credentials or expiring tokens, so do not publish them.

Tests cover registration, verification gating, password hashing, duplicate registration, successful/failed login, reset revocation/replay/expiry, rate limits under concurrent requests, encrypted mail tampering, booking overlap rejection and invalid coordinates. Browser tests exercise the real UI, Auth.js cookies, session restoration, logout, ownership filtering, customer/admin access and reset with an old session cookie. They run in desktop Chromium and Chromium mobile emulation, not physical devices or Safari.

## Remaining work

The database foundation and local account workflows do not complete the full rental platform. The next milestone is full catalog filtering/pagination/grid/list/map and availability, then transactional booking/driver upload/pricing, verified payment sandbox/webhooks/refunds, complete dashboards, GSAP/loading refinements, measured performance and deployment hardening. SMTP/Google credentials, publication licenses for reference photography and actual host capabilities remain external configuration checks.
