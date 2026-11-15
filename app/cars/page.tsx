import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { CarFront } from "lucide-react";
import { SearchForm } from "@/components/home/search-form";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { catalog } from "@/lib/server/vehicles";
import { rentalSearchSchema, isPickupInPast } from "@/lib/search";
export const metadata: Metadata = { title: "Explore Cars" };
type Params = Record<string, string | string[] | undefined>;
const single = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : "";
async function Catalog({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const raw = await searchParams;
  const location = single(raw.location),
    brand = single(raw.brand),
    category = single(raw.category),
    q = single(raw.q).slice(0, 100),
    sort = single(raw.sort);
  const pickup = single(raw.pickup),
    returnAt = single(raw.return);
  const dateCheck =
    pickup || returnAt
      ? rentalSearchSchema.safeParse({ location: "", pickup, return: returnAt })
      : null;
  const invalidDates =
    dateCheck && (!dateCheck.success || isPickupInPast(pickup));
  const { vehicles, total, brands, categories, locations } = await catalog({
    location,
    brand,
    category,
    q,
    sort,
  });
  return (
    <>
      <div className="container catalog-search">
        <SearchForm
          initial={{
            location: ["Miami", "New York", "Los Angeles"].includes(location)
              ? (location as "Miami" | "New York" | "Los Angeles")
              : "",
            pickup,
            return: returnAt,
          }}
        />
      </div>
      <div className="container catalog-content">
        <p className="notice">
          Database-backed demonstration inventory. Reservations, date
          availability and payments are the next implementation milestone.
        </p>
        {invalidDates && (
          <p className="field-error" role="alert">
            Choose a future pickup and a return after pickup. Dates cannot be
            used to check availability in this preview.
          </p>
        )}
        <div className="catalog-toolbar">
          <strong>
            Showing {vehicles.length} of {total} demo cars
          </strong>
          <span>Explore the collection · USD / day</span>
        </div>
        <div className="catalog-layout">
          <aside className="filter-panel">
            <h2>What Are You Looking For?</h2>
            <form action="/cars">
              {pickup && <input type="hidden" name="pickup" value={pickup} />}
              {returnAt && (
                <input type="hidden" name="return" value={returnAt} />
              )}
              <label>
                Search Cars
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search by vehicle name"
                  maxLength={100}
                />
              </label>
              <label>
                Car Brand
                <select name="brand" defaultValue={brand}>
                  <option value="">All brands</option>
                  {brands.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Car Category
                <select name="category" defaultValue={category}>
                  <option value="">All categories</option>
                  {categories.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Location
                <select name="location" defaultValue={location}>
                  <option value="">All cities</option>
                  {locations.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Sort By
                <select name="sort" defaultValue={sort}>
                  <option value="">Recommended</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                </select>
              </label>
              <button className="button button-dark w-full" type="submit">
                Filter Results
              </button>
              <Link href="/cars" className="clear-link">
                Clear All
              </Link>
            </form>
          </aside>
          <div className="catalog-grid">
            {vehicles.length ? (
              vehicles.map((vehicle) => (
                <VehicleCard key={vehicle.slug} vehicle={vehicle} />
              ))
            ) : (
              <div className="empty-state">
                <CarFront size={40} />
                <h2>No cars found</h2>
                <p>Try another location, category or brand.</p>
                <Link href="/cars" className="button button-dark">
                  Clear Filters
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
export default function CarsPage(props: { searchParams: Promise<Params> }) {
  return (
    <main id="main-content" className="bg-neutral-50">
      <section className="page-banner">
        <div className="container">
          <h1>Car Listings</h1>
          <p>
            <Link href="/">Home</Link> / <span>Car listing Grid View</span>
          </p>
        </div>
      </section>
      <Suspense
        fallback={
          <div className="container section">
            <div className="skeleton" aria-label="Loading cars" />
          </div>
        }
      >
        <Catalog {...props} />
      </Suspense>
    </main>
  );
}
