# Phase 1 implementation status

Historical UI milestone record. See [phase-2-status.md](phase-2-status.md) for the subsequent database/authentication implementation and current verification.

Date: 15 November 2026.

**The homepage UI has been rebuilt against the supplied `Home 1.png` and verified locally.** This is the UI foundation, not the completed full-stack rental platform.

## Delivered

- Original SVG Veltrix identity and shared reference-style header/footer.
- Self-hosted Fira Sans in Latin WOFF2 subsets; removed provisional fonts.
- Matched SUV cutout and orange diagonal hero, separate date/time search controls and the reference’s 1296px desktop content container.
- Three-step how-it-works section, eight popular vehicle cards in a four-column desktop grid, category carousel and dark four-statistic band.
- Three visible recommended cars with working carousel controls, benefits, three illustrative customer stories and seven FAQs.
- Four-column example pricing with a monthly/yearly toggle, dark Audi app banner, three article cards and the five-column footer.
- Working homepage brand filters and a browser-local shortlist, including persistence across refresh. This is not an account-backed favorites service.
- Twelve consistent demo vehicle records, shared catalog/detail previews, URL filters and validated rental search.
- Responsive layouts, accessible dialog behavior, loading/error/not-found/empty states and original branding throughout.

## Verification

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: nine tests passed for date ranges, malformed/impossible dates, past pickup and currency formatting.
- `npm run build`: passed with the existing Cache Components/Partial Prefetching configuration.
- `npm run test:e2e`: sixteen tests passed across desktop Chromium (1920 × 1080) and Chromium with iPhone 13 viewport/touch emulation (390 × 664). This is not a physical-device or Safari test.
- Browser checks cover search/date validation, URL criteria, combined catalog filters, refresh persistence, empty results, vehicle navigation, missing vehicles, dialog focus/keyboard dismissal, mobile navigation, homepage brand filters, persisted browser shortlisting, pricing toggle and carousel controls.
- Homepage checks found no horizontal overflow, broken rendered images or page errors at those sizes. A mobile regression check ensures the hero vehicle does not overlap the copy or call to action.
- Captured desktop/mobile screenshots and visually compared the desktop composition with the supplied export. No automated pixel-equality or performance-score claim is made.

Screenshots: [desktop](screenshots/home-chromium.png), [mobile](screenshots/home-mobile.png), [reference comparison](screenshots/home-comparison.png).

## Intentional differences and remaining limits

Original Veltrix branding replaces the template identity. Inflated customer/rental statistics and verified-review claims are replaced with actual demo counts and labeled illustrative content. Car links open their details; reservations remain disabled. Packages are examples and cannot be purchased. The mobile stores and newsletter explicitly show their unavailable state. Dark text on orange buttons improves legibility. Rental cities, terms and vehicle data are demonstration fixtures rather than production records.

The export is a desktop design. Mobile behavior is inferred, tested in Chromium and visually inspected; wider tablet/device/browser coverage, a full accessibility audit and measured performance work remain. The Figma URL could not be opened, so the supplied screenshot is the visual authority.

Reference asset publication rights still require verification or replacement before public deployment. The asset manifest records provenance; Fira Sans’s OFL license is included. No template HTML, CSS or JavaScript was incorporated into application source.

The dependency audit during Phase 1 reported zero production findings and seven moderate development-tool findings through `typescript-eslint`/`minimatch`; the ordinary nonbreaking audit fix did not resolve them. These audit counts are historical checks, not a security certification.

## Subsequent phases remain unimplemented

PostgreSQL/Prisma/migrations; authoritative vehicle data and availability; complete grid/list/map and pagination; account-backed favorites; Auth.js/account lifecycle; transactional bookings/conflict prevention; private identity uploads; server-verified financial calculations; payment webhooks/refunds; receipt/email; customer/admin dashboards; integration tests; dedicated demo hosting and production deployment.

No database, booking or payment implementation has been started, and no external accounts or hosting were created.
