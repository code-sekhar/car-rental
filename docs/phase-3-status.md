# Phase 3 implementation and verification

Baseline `d15218f` and existing Git history were preserved. The interrupted changes were audited: rental helpers, schema/seeder/security changes and migration 003 existed; functional booking/catalog integration did not. Migration 003 had already executed locally. No database reset, service replacement, production credentials or deployment was used.

## Implemented

- PostgreSQL/Prisma catalog search; combined brand/category/location/price/fuel/transmission/minimum-seats filters; stable sorting and bounded pagination. URL criteria survive filters, date searches, pagination and view switches.
- Grid and horizontal list views, lazy Leaflet map using valid stored coordinates and explicit missing-coordinate state. Markers offer working vehicle links and map controls.
- Location-zone-aware rental validation, DST gap/fold rejection, bounded rental horizon/duration, availability against maintenance blocks and conflicting active reservations.
- Authenticated persisted booking steps: location/time, extras/quantities, self-drive/chauffeur, insurance, driver details, coupon and server-priced review. Driver license numbers are encrypted and excluded from public DTOs. Private document upload stays unavailable.
- Versioned/idempotent drafts, 24-hour draft expiry, revalidated transactional 15-minute unpaid holds, immutable historical price snapshots, coupon usage locking and parent vehicle locks backed by the PostgreSQL exclusion constraint.
- Customer booking list/details, upcoming/history status information, pagination, resume, unpaid cancellation and cancellation-review requests for confirmed/active/potentially paid rentals. Ownership is enforced at every private operation.
- Payment preparation displays the actual unpaid state and disabled payment action. It never marks a rental paid or confirmed.
- Existing homepage, branding, authentication, responsive navigation and login dialog remain working. Login from a new booking returns to that booking flow after authentication.

## Database

Development and isolated test databases have all four migrations applied. New migrations:

1. `202611150003_catalog_and_reservations`: versioned drafts, pricing policy, driver age confirmation, service/tax snapshots, cancellation records, catalog/booking indexes, pending-expiry check and cross-table maintenance/booking guards.
2. `202611150004_conservative_pending_blocks`: maintenance guard matches the exclusion constraint, blocking pending rows until explicit application expiry, without reliance on a second clock source.

`prisma migrate status`: up to date. `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma`: no difference detected. The local system PostgreSQL service and existing data were preserved. Seeder upserts add demo pricing policy, chauffeur service and WELCOME10 coupon without replacing existing inventory/accounts.

## Executed checks

- ESLint: pass.
- Strict TypeScript / Next route type generation: pass.
- Vitest: 26 unit tests pass.
- Real PostgreSQL integration: 28 tests pass, including combined filters, pagination/sorting, DST and invalid periods, duplicate/concurrent submissions, overlap exclusion even without service locks, ownership, expired holds/drafts, price-change rejection, historical snapshots, maintenance conflicts and cancellation review.
- Production build: pass, including new booking/customer routes.
- Playwright production build: 26 tests pass across desktop Chromium and mobile Chromium emulation. Authentication registration/verification/login/refresh/logout/reset, protected access, catalog views/filters/pages, persisted booking/review/hold/cancel/history and map markers/popups/zoom all passed. Browser journey assertions observed no page errors or horizontal overflow.
- Screenshot inspection: booking review desktop and catalog list desktop/mobile inspected; generated screenshots also cover review/mobile, customer history and map fixtures.

A first browser run found invalid date messages were masked by an Error subclass name; corrected and verified by the complete passing rerun. The interrupted browser run was not counted as a pass. The map test uses a clearly labelled database fixture in the isolated test database and stubs only external tile responses to avoid CI reliance on a third party service; real production tile delivery/service quality is not claimed verified.

The PostgreSQL adapter emits a non-failing pg deprecation warning about concurrent queries on a client during the existing transaction workflows. Current pinned pg 8 tests pass; audit this before a pg 9 upgrade. No Core Web Vitals or exhaustive accessibility/performance score is claimed.

## Screenshots

- [Booking review — desktop](screenshots/booking-review-chromium.png)
- [Booking review — mobile](screenshots/booking-review-mobile.png)
- [List catalog — desktop](screenshots/catalog-list-chromium.png)
- [List catalog — mobile](screenshots/catalog-list-mobile.png)
- [Map fixture — desktop](screenshots/catalog-map-fixture-chromium.png)
- [Map fixture — mobile](screenshots/catalog-map-fixture-mobile.png)
- [Customer bookings — desktop](screenshots/my-bookings-chromium.png)
- [Customer bookings — mobile](screenshots/my-bookings-mobile.png)

## Files

Core additions: `lib/rental/{catalog,period,pricing,validation}.ts`, `lib/server/{availability,bookings}.ts`, booking API handlers, `app/booking/{new,[id]}`, customer booking list/details, `components/booking/`, lazy catalog/Leaflet map components, two migrations and unit/integration/browser rental tests.

Updated: catalog queries/DTO/pages/details, homepage search data and filter preservation, auth return destination, customer dashboard, scoped private encryption, seed/maintenance scripts, Prisma schema, dependencies/TypeScript target, reference-consistent booking/catalog styles, footer availability wording, existing browser expectations, README/architecture/shared-hosting documentation and synthetic screenshots. The feature commit lists every exact file (`git show --stat`).

## Remaining limits and next milestone

Payment provider sandbox initialization, verified signatures/webhooks, idempotent payment confirmation/refunds, paid booking emails and receipts are the next milestone. No payment succeeded and no confirmed rental was simulated by the application. Complete operational admin management and later animation/performance work remain outside this phase.

Seed pickup locations have no verified coordinates; real operational locations must be configured before inventory appears on the map. Uploads need durable private storage plus content/size/access/retention controls. SMTP and optional Google OAuth still require real configured services. Existing reference-image publication rights remain unverified. These do not prevent testing unpaid reservations but must be resolved for a public commercial launch.

Shared hosting still requires compatible persistent Node execution, PostgreSQL/btree_gist, environment configuration, HTTPS/logs and a scheduler. No Docker/Redis/root/systemd dependency was added. See [phase-3-architecture.md](phase-3-architecture.md) and [shared-hosting.md](shared-hosting.md). Nothing was deployed.
