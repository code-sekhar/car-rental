# Catalog and unpaid reservations

This phase extends the existing UI/Auth.js foundation. It does not enable payment or confirm rentals.

## Catalog

`lib/server/vehicles.ts` constructs a Prisma `where` clause from validated URL parameters. Search, brand, category, location, price, fuel, transmission and minimum seating filters combine with date availability. Sorting uses a stable ID tie-breaker; count, skip and take provide bounded server pagination. Page size is 9, 12 or 24; out-of-range pages clamp to the last page. Grid/list/map switches preserve the URL criteria. Date search uses the pickup area's IANA time zone.

The Leaflet module is dynamically loaded only for map view. Markers use stored location coordinates, with numeric/range checks and visible OpenStreetMap attribution. Vehicle links in marker popups use DOM text rather than interpolated HTML. Missing coordinates produce an explicit empty state. Existing seed locations have no verified coordinates; no branch positions were invented. Configure real coordinates before expecting demo inventory to appear on the map. `NEXT_PUBLIC_MAP_TILE_URL` may select a compatible tile provider; operator attribution/licensing must be configured accordingly before using a different provider. Default public OSM tiles require internet access, compliant normal browser requests, attribution and modest usage; they offer no service guarantee. See [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/) and [Leaflet documentation](https://leafletjs.com/reference.html). No map API key or new backend infrastructure is mandatory.

## Rental periods

Local minute-resolution date/time values are interpreted in the selected pickup and return locations' IANA zones using Temporal. Missing and ambiguous daylight-saving times are rejected. Pickup must be future, return later, and duration/advance horizon within the stored pricing policy. Billing is per started 24-hour elapsed period (ceil), including DST effects. Intervals are half-open: an adjacent return/pickup is allowed. Delivery is limited to the vehicle's configured pickup area; return may be another active location. This is an explicit operational rule, not route-distance pricing.

## Reservation integrity

Creation requires an authenticated verified account. A caller-scoped hash of a UUID prevents duplicate draft creation, and a request hash rejects reuse with different content. Drafts persist location/time, extra quantities, encrypted license information, driver and insurance selections, coupon and a version. They expire after 24 hours and do not reserve inventory. Optimistic versions prevent overwriting changes from another tab.

Every booking mutation locks the parent vehicle before reading/updating the booking. A hold expires stale reservations, revalidates locations/period/vehicle/availability, checks driver details, recomputes the quote and compares its hash with the reviewed version. It then creates the historical price snapshot and transitions atomically to `PENDING_PAYMENT`. A repeated hold submission returns the same hold. The PostgreSQL exclusion constraint is the final guard against overlapping pending/confirmed/active bookings; triggers also coordinate maintenance blocks with bookings using the same parent lock. Pending rows conservatively block database maintenance until explicitly expired, matching that constraint.

Database and application clocks should be synchronized in production. The local environment exposed a clock offset; business expiry uses one application clock and no cross-table constraint depends on a second clock source. Read-time cleanup and the maintenance scheduler explicitly expire stale rows. No database was reset or overwritten.

Integer minor units are validated and multiplied/summed with BigInt. Percentage discounts and taxes round half up to the nearest cent. Discounts apply to rental + extras + insurance + delivery, are capped at that subtotal, and taxes apply after discounts; the refundable deposit is added afterwards and is not taxed. The stored demo policy is 8% tax, a 15-minute hold, maximum 30-day rental, 365-day advance horizon, USD. These are demonstration business settings, not jurisdictional tax advice. Coupons are validated by status, dates, minimum subtotal and usage. Coupon locking serializes usage limits at reservation time. Held price snapshots survive later inventory price changes.

## Privacy and cancellation

Credentials and session registry revocation remain unchanged. Every service checks account status and every private booking lookup/mutation scopes by user ID. API mutations require same-origin, bounded JSON and database-backed rate limits. Public responses omit license plaintext/ciphertext and document keys. License numbers use scoped AES-256-GCM encryption derived from the server secret; keep that secret stable and back up securely. Identity upload is unavailable until durable private storage and its validation/access/retention controls are configured. The UI explicitly distinguishes an unpaid hold from verified eligibility and a confirmed rental.

Unpaid drafts and holds cancel immediately, with an approved cancellation record and audit trail. Confirmed/active or potentially paid/processing bookings create a review request without releasing inventory, refunding funds or claiming completion. No provider verification, payment confirmation, receipt or refund execution is implemented here. The payment button remains disabled. Booking detail and history screens use PostgreSQL records and preserve the original customer ownership guard.

## Operations and portability

No Docker, Redis, privileged service or VPS requirement was added. Continue using standard Node/Next.js, PostgreSQL with `btree_gist`, environment variables, HTTPS, logs and a supported scheduler. Run `npm run db:migrate` before starting the new build. Run `npm run maintenance` approximately every minute without overlapping runs; it expires drafts/holds and maintains existing auth/mail housekeeping. Read-time expiry also releases stale holds before reservation. SMTP, private upload storage and provider payment credentials remain separate launch requirements. Nothing has been deployed.
