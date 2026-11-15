# Veltrix Rentals architecture

The UI notes below record Phase 1. The current server/database/authentication architecture is documented in [database-and-auth.md](database-and-auth.md), and the current catalog/reservation architecture in [phase-3-architecture.md](phase-3-architecture.md), with deployment requirements in [shared-hosting.md](shared-hosting.md). Runtime pages now read PostgreSQL and the authentication preview has been replaced.

## Current implementation: Phase 1

The application uses Next.js 16.4.6 App Router, React 19.3, strict TypeScript, Tailwind 4 and Lucide. The existing Next.js installation and bundled documentation are authoritative. No framework migration or experimental configuration change was made.

`app/layout.tsx` composes the shared header, footer, self-hosted Fira Sans WOFF2 font and default metadata. Pages remain Server Components. Interactive boundaries are limited to the header/navigation/dialog, rental search form, and framework error recovery.

- `app/page.tsx`: the fifteen homepage sections rebuilt against `public/Home 1.png`: matched SUV/banner artwork, four-column/eight-car popular collection, category/recommendation carousels, dark facts and testimonial bands, seven FAQs, four-column pricing, app promotion and article cards.
- `components/layout`: original Veltrix identity, responsive navigation, footer, accessible native dialog.
- `components/home`: reusable section heading and React Hook Form/Zod rental search with separate accessible date/time fields composed into validated local datetime values.
- `components/vehicles`: server-rendered cards with Next Image and integer-cent price display.
- `lib/demo-vehicles.ts`: explicitly named, typed development fixtures. These are NOT authoritative inventory, pricing or availability.
- `app/cars`: a limited preview catalog to exercise homepage search and shared UI. Server-side in-memory filtering, GET URL filters and sorting. Dynamic request reading is inside Suspense to support the existing Cache Components configuration.
- `app/cars/[slug]`: read-only preview detail and metadata. Missing vehicles use `notFound()`.
- `lib/search.ts`: shared form input validation. Dates are local browser times in this phase; production bookings must use explicit rental-location time zones and persisted UTC instants.
- `tests/unit`: meaningful search-validation and price-display tests.
- `tests/e2e`: desktop/mobile browser checks for search, filters, navigation, empty states, detail previews, dialog and overflow.

Homepage filters, carousel controls and the sample pricing period use local component state. Browser-local shortlisting uses `useSyncExternalStore` with storage events; it is not an account-backed favorite service. There is no third-party client cache or global state store: neither is warranted by Phase 1. Authentication and booking controls are explicitly disabled. No account, payment, upload or reservation is created.

## Design system

The screenshots guide the shared chrome, Fira Sans typography, orange `#FFA52D`, teal `#10788A`, near-black `#201F1D`, pale gray surfaces, compact borders, cards and forms. Orange uses dark foreground text for legibility. CSS variables and Tailwind theme variables live in `app/globals.css`. Reference composition and responsive overrides live in `app/home.css`, imported from the root layout so shared chrome is consistent on direct catalog visits. Breakpoints cover mobile (560px), tablet (800px), compact desktop (1000/1250px), and wide desktop.

The logo is original: a V silhouette with a road-shaped center, supplied as a scalable mark for light and dark surfaces. Header and footer share one React logo component. No template logo is shown.

## Intended subsequent phases (not implemented)

1. Review the matched homepage and its documented demo-content/accessibility differences; finish broader tablet and accessibility checks.
2. PostgreSQL/Prisma schema, migrations, fixture seed, server-only repository layer; database-driven catalog, URL filters and pagination; details and geocoded map view.
3. Auth.js and account lifecycle, role checks on every private operation, abuse prevention, customer dashboard.
4. Transactional booking holds, UTC/location-time-zone rules, versioned integer-cent price snapshots, expiration, PostgreSQL exclusion constraints for overlapping active reservations, request idempotency.
5. Payment provider sandbox adapter, verified signed webhooks, idempotent events, receipts/email, cancellation and refund states.
6. Admin operations, private uploads, audit logs, moderation and operational controls.
7. Full unit/integration/E2E coverage, performance measurement, deployment and dedicated demo environment.

A production booking must never depend on these UI fixtures. All authoritative totals, discounts and availability checks belong on the server. Persist immutable price snapshots and separate booking/payment/refund states. External services remain disabled until configured and verified.
