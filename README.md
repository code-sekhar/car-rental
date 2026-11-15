# Veltrix Rentals

A portfolio car-rental application built with Next.js App Router, React, strict TypeScript, Tailwind, PostgreSQL/Prisma and Auth.js. The supplied reference-based Veltrix UI is preserved.

**Current milestone: real database and authentication foundation.** Registration, email verification, credentials login, session restoration/logout, password recovery, protected account pages and administrator authorization are implemented. The full booking/payment platform is not complete.

## Local development

Node 24 LTS is recommended and tested; package compatibility also allows Node 22.12+. PostgreSQL 18 is available on the development machine. No Docker, Redis, root account or system service is required.

```bash
npm ci
npm run db:setup:local
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000. Setup creates a separate loopback-only local cluster on port 55432 and private environment configuration; it leaves the system cluster and existing databases untouched. For a provider-managed database, configure `.env` from `.env.example` instead of running the local setup helper.

See [database/auth setup and demo accounts](docs/database-and-auth.md) and [shared-hosting requirements](docs/shared-hosting.md).

## Working features

- Reference-based responsive homepage, original Veltrix branding, Fira Sans, optimized local images and shared navigation/footer.
- Database-backed home inventory, catalog search/combined filters/sorting and vehicle details. Seed data is explicitly demonstration inventory; runtime application pages no longer import fixture vehicles.
- Real Auth.js login with Argon2id passwords, verified accounts, encrypted session cookies and PostgreSQL revocation checks.
- Registration, verification/recovery email outbox, single-use expiring tokens, password reset and session invalidation.
- Accessible login dialog and dedicated account forms with loading/validation/error states.
- Authenticated profile/bookings/notifications foundation and role-protected admin overview with real database counts.
- URL-based vehicle search, loading/error/empty/not-found states, working carousels and a browser-local shortlist. Account-backed favorites are a later feature.

Local setup writes rendered verification/recovery emails to the private `.local/mail` directory. Follow the link locally to verify an account. This is explicitly a local transport, not verified external SMTP delivery. Production registration/recovery requires configured SMTP. Google OAuth remains disabled without credentials.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
npx playwright install chromium
npm run test:e2e
npm run db:status
```

Integration/browser tests use the separate test database and prepare it automatically. The browser suite starts the production build on port 3100. Build first. Failure traces/private test mailbox files are ignored and must not be published.

## Production and shared hosting

```bash
npm ci
npm run db:generate
npm run db:migrate
npm run build
npm run start
```

The host must support a persistent compatible Node application, environment variables, HTTPS, PostgreSQL connectivity/`btree_gist`, application logs and a supported startup/restart mechanism. Static/PHP-only hosting cannot run this application. There is no static export and no provider-specific deployment configuration. Nothing has been deployed.

Run `npm run maintenance` through a provider-supported scheduler to retry queued email and expire sessions, rate limits, old tokens and booking holds. See the hosting document for secrets, TLS, pool limits, persistent private uploads, logs, scheduled tasks and compatibility gates.

## Documentation

- [Database/authentication architecture and migration history](docs/database-and-auth.md)
- [Shared-hosting compatibility and operations](docs/shared-hosting.md)
- [UI architecture](docs/architecture.md)
- [Design/asset provenance](docs/design-audit.md)
- [Phase 1 UI record](docs/phase-1-status.md)
- [Current milestone verification](docs/phase-2-status.md)

## Remaining milestones

Full grid/list/map and availability; transactional booking and server pricing; private identity uploads; verified sandbox payments/webhooks/refunds; receipts/email; complete customer/admin operations; GSAP animations and branded loaders; broader accessibility/performance measurement and production deployment.

Reference photographs are local design-preview assets with unverified publication rights. The original logo belongs to this project and Fira Sans's OFL license is included. No production credentials or real customer records are seeded or documented.
