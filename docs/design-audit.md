# Reference and asset audit

## Available screens

- Grid View.jpg — desktop catalog, search, filters, cards, pagination, shared header/footer.
- List View.svg — horizontal catalog and original embedded photographs.
- Map View.png — split listing/map layout.
- Detail Page.jpg — gallery, specifications, policies, reviews, booking sidebar.
- Booking Starts - Delivery.jpg — rental type, locations, dates and step progress.
- Booking Add Ons & Self Driver - Delivery.jpg — services, driver form and insurance.
- Booking Add Ons & Driver - Delivery.svg — chauffeur selection.
- Booking Add Ons & Select Driver - Delivery.svg — driver selection variant.
- Booking Payment - Delivery.svg — payment layout.
- Booking Success - Delivery.svg — confirmation layout.
- Login Popup - Delivery.jpg — sign-in dialog proportions and overlay.

`Home 1.png` is now supplied and is the primary homepage reference (1920 × 9763). The implementation follows its section order, 1296px content container, SUV cutout and orange diagonal hero, eight-card grid, category tiles, four statistics, three recommended cards, dark testimonial band, seven FAQs, pricing columns, app banner and footer. The Figma URL remains inaccessible through the web tool; the supplied export is sufficient to implement the homepage.

## Asset provenance

`scripts/prepare-reference-assets.mjs` extracts original embedded photographs from the supplied SVG exports and encodes smaller WebP files. It never renders a complete screenshot as the UI. Image rights were not supplied or independently verified. These photographs are local reference-preview assets only; obtain licenses or replace them with verified licensed assets before publishing or commercial use.

The input design files themselves contain original template branding. They are preserved as user-supplied reference sources, but are never rendered as application pages. The application logo and text use Veltrix Rentals.

Fira Sans is self-hosted in Latin WOFF2 subsets from Google Fonts and licensed under the SIL Open Font License; the license is retained in `app/fonts/FiraSans-OFL.txt`. It replaces the provisional Barlow font after inspection of the reference typography.

Matching individual photographs, cutouts, backgrounds and category illustrations were retrieved from the template’s public preview at `https://dreamsrent.dreamstechnologies.com/html/template/index-2.html`. No template HTML, JavaScript or CSS was copied into the application. `docs/home-asset-manifest.json` records each asset source. `scripts/prepare-home-assets.mjs` validates and converts downloaded raster assets to WebP, retaining transparency where supplied. SVG validation rejects executable elements. Publication rights remain unverified.

## Visual comparison boundaries

Header height, brand placement, navigation/action alignment, reference colors, rectangular buttons, card surfaces and footer columns are implemented using the supplied desktop screenshots. Breakpoints are inferred because mobile design exports are absent. The current desktop screenshot is compared with the homepage export in `docs/screenshots/home-comparison.png`. No automated pixel-equality claim is made.

Intentional differences: Veltrix branding replaces template branding; inflated trust/customer/rental statistics are replaced with labeled demo counts; customer stories and star ratings are identified as illustrative; the fleet uses a consistent twelve-vehicle fixture collection and three sample US cities; browser shortlist controls save locally; car links say “View Car” while booking is disabled; package prices are labeled examples; app stores/newsletter are explicitly disabled until implemented; dark text improves legibility on orange action buttons. Mobile layouts are inferred from the desktop export.

The current catalog and detail pages are limited component previews. Full grid/list/map, favorites, pagination, database records, availability and booking fidelity belong to subsequent phases.
