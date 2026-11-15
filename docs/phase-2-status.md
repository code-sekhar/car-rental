# Database/authentication milestone verification

Date: 15 November 2026. No deployment was performed.

## Completed functionality

The interrupted implementation was audited before work resumed. The original project was preserved; no Git repository/history exists in this workspace. Dependencies/schema/config/setup helper were present, but the isolated cluster, migrations, seed and authentication had not been completed.

The application now has PostgreSQL-backed home/catalog/detail data and real account workflows: registration, verified-email credentials login, logout, session restoration, password recovery/reset, protected account pages, administrator authorization, ownership-scoped booking reads, notifications and audit records. The reference-based Phase 1 homepage, cards, search, navigation, details and mobile layouts remain in place.

Auth.js uses encrypted JWT cookies with a PostgreSQL registry of hashed session keys. Every protected request validates the registry, expiry, verified-email/disabled state and current role. The browser tests prove revocation by keeping an old cookie after password reset and observing a 401. No successful login is simulated.

## Database migration results

- Existing system PostgreSQL 18 service on port 5432 was not changed.
- Created isolated loopback-only development cluster on port 55432 with private generated credentials; no database was overwritten.
- Application role `veltrix` is not a superuser and cannot create databases.
- `202611150001_foundation`: executed successfully against development and test databases.
- `202611150002_catalog_integrity`: executed successfully against development and test databases.
- `prisma migrate status`: schema up to date, no pending migrations.
- Development seed verified: twelve demo vehicles, three locations, two dedicated demo accounts, brands/categories/images, extras and insurance.
- Database exclusion constraint rejects concurrent overlapping confirmed reservations; monetary/date/rating/coordinate/coupon constraints and relational keys are present. This does not imply that the booking application flow is implemented.
- `npm run maintenance`: executed successfully against development configuration.

## Verification results

- ESLint: passed.
- Strict TypeScript: passed.
- Unit tests: sixteen passed.
- Real PostgreSQL integration tests: eleven passed.
- Playwright: twenty passed across desktop Chromium and Chromium mobile emulation.
- Production build: passed with Prisma generation and the existing Cache Components configuration.
- Production dependency audit: zero reported vulnerabilities at the recorded check. Seven moderate development-tool advisories remain; no forced major ESLint stack upgrade was applied.
- Build trace inspection: sixteen manifests inspected; no `.env` or `.local` runtime paths included.

Integration coverage includes password hashing/verification gating, duplicate registration, single-use/expired verification and reset tokens, session deletion after reset, concurrent rate limiting, repeated-login throttling, encrypted-mail tamper detection, overlapping booking rejection, invalid coordinates and streamed request-size bounds.

Browser coverage includes registration, following an actual link from the private rendered mailbox, verification, login, refresh persistence, logout, recovery/reset, old-password rejection, old-cookie revocation, token replay, user-record scoping, anonymous/customer/admin authorization, role injection/origin rejection, and existing UI/search/carousel/shortlist/pricing interactions. These use a separate `_test` database prepared automatically; tests do not reset development data. Homepage browser checks found no page errors, broken images or horizontal overflow at tested sizes. Dialog keyboard focus/restoration and fresh-state reopening are covered. This is not Safari/physical-device or full accessibility/performance certification.

Account UI captures: [desktop](screenshots/account-chromium.png), [mobile](screenshots/account-mobile.png). They contain synthetic test account information only.

## Files created

- `prisma/migrations/202611150001_foundation/migration.sql`, `prisma/migrations/202611150002_catalog_integrity/migration.sql`, migration lock, and `prisma/seed.ts`.
- `lib/server/db.ts`, `vehicles.ts`, `accounts.ts`, `auth.ts`, `auth-adapter.ts`, `security.ts`, `mail.ts`, `http.ts`; public `lib/vehicle.ts` DTOs and `lib/auth/validation.ts`.
- `types/next-auth.d.ts`, `types/nodemailer-smtp.d.ts`.
- `components/auth/provider.tsx`, `auth-form.tsx`, `token-form.tsx`, `sign-out.tsx`.
- Auth pages `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`; protected `/dashboard` and `/admin` foundations.
- Route handlers `/api/auth/[...nextauth]`, `/api/account/[action]`, `/api/admin/overview`.
- `scripts/maintenance.ts`.
- `vitest.integration.config.mts`, integration account tests, test database/server-only helpers, auth validation unit tests and real-auth Playwright tests.
- `docs/database-and-auth.md`, `docs/shared-hosting.md`, this milestone record and synthetic account screenshots.
- Ignored/private local PostgreSQL cluster, generated `.env`, Prisma generated client and private mail/test outputs. These must not be committed or deployed as source.

## Files modified

- `package.json`/lock: compatible stable dependencies, generation/migration/seed/test/maintenance scripts, Node engine range, ESM configuration.
- `prisma/schema.prisma` and `prisma.config.ts`: normalized models and executable migration/seed configuration.
- `scripts/setup-local-db.mjs`: audited safe local setup, formatting/unused import cleanup.
- `.gitignore`, `.env.example`, `eslint.config.mjs`, `next.config.ts`: private/generated-file exclusion, provider-neutral environment example, generated-code lint exclusions and safe build tracing.
- `app/layout.tsx`, `components/layout/header.tsx`, `app/globals.css`: real auth provider/forms, signed-in navigation, account/auth styling and modal feedback without replacing the established branding.
- `app/page.tsx`, `app/cars/page.tsx`, `app/cars/[slug]/page.tsx`: server-side PostgreSQL reads instead of runtime fixture imports.
- `components/vehicles/vehicle-card.tsx`, `components/home/pricing.tsx`: public DTO imports and stored representative image data.
- Existing unit/browser tests and Playwright configuration: updated real-auth expectations, active-route scoping and isolated test database setup.
- README and UI architecture/status records: current setup/limitations and links to the backend/deployment documentation.

The original fixture module remains only as seed input. No runtime application page/component imports it. No homepage assets were replaced.

## Remaining issues and external configuration

- SMTP transport is implemented but external SMTP delivery is unverified without credentials. Local browser tests use explicitly enabled private file delivery; no live-delivery claim is made.
- Google OAuth is implemented and disabled until configured; external Google consent/callback behavior is unverified without credentials.
- Shared-hosting provider capabilities, database extension/TLS permissions and scheduling/storage support are unknown. Requirements are documented; no provider was configured and nothing deployed.
- Booking steps, live availability, full catalog pagination/list/map, account-backed favorites, driver uploads, checkout, sandbox payment verification, receipts/refunds and complete dashboards remain subsequent milestones.
- GSAP, branded loader refinements, broad accessibility auditing, measured Core Web Vitals and publication-license verification remain outstanding.

## Shared-hosting compatibility and next milestone

The application uses standard `next build`/`next start`, PostgreSQL/Prisma, Auth.js and Route Handlers. No Redis, Docker, VPS, root permission or systemd is required in production. A compatible host must supply a supported persistent Node runtime, environment configuration, HTTPS, logs, database connectivity/`btree_gist`, SMTP and a scheduler. Private uploads will require durable private storage before that feature is enabled. See [shared-hosting.md](shared-hosting.md) for the full capability gate, startup/migration instructions and limitations.

Next milestone: complete database-backed catalog filtering/pagination/grid/list/map and authoritative availability, then transactional booking and server-calculated price snapshots. Booking/payment controls remain disabled until those workflows are implemented and verified.
