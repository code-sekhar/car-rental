import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { CarFront } from "lucide-react";
import { SearchForm } from "@/components/home/search-form";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { catalog } from "@/lib/server/vehicles";
import { CatalogMap } from "@/components/vehicles/catalog-map";
export const metadata: Metadata = { title: "Explore Cars" };
type Params = Record<string, string | string[] | undefined>;
async function Catalog({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const raw = await searchParams;
  let result;
  try {
    result = await catalog(raw);
  } catch (error) {
    return (
      <div className="container section">
        <h2>Check your search</h2>
        <p role="alert">
          {error instanceof Error &&
          (error.name === "InputError" || error.name === "ZodError")
            ? error.name === "ZodError"
              ? "Some filters are invalid. Check prices, dates and locations."
              : error.message
            : "The catalog is temporarily unavailable."}
        </p>
        <Link href="/cars">Clear filters</Link>
      </div>
    );
  }
  const {
    vehicles,
    total,
    brands,
    categories,
    locations,
    fuels,
    page,
    pages,
    params,
  } = result;
  const {
    location,
    brand,
    category,
    q,
    sort,
    pickup,
    return: returnAt,
  } = params;
  const href = (changes: Record<string, string>) => {
    const p = new URLSearchParams(
      Object.entries(raw).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
    Object.entries(changes).forEach(([k, v]) => p.set(k, v));
    return `/cars?${p}`;
  };
  return (
    <>
      <div className="container catalog-search">
        <SearchForm
          locations={locations}
          preserve={Object.fromEntries(
            Object.entries(raw).filter(
              (e): e is [string, string] => typeof e[1] === "string",
            ),
          )}
          initial={{
            location,
            pickup,
            return: returnAt,
          }}
        />
      </div>
      <div className="container catalog-content">
        <p className="notice">
          Demonstration inventory · Enter location and dates to check live
          availability. Times use the pickup location’s time zone.
        </p>
        <div className="catalog-toolbar">
          <strong>
            Showing {total ? (page - 1) * params.pageSize + 1 : 0}–
            {Math.min(page * params.pageSize, total)} of {total} cars
          </strong>
          <nav aria-label="Catalog view">
            {["grid", "list", "map"].map((view) => (
              <Link
                key={view}
                aria-current={params.view === view ? "page" : undefined}
                className="button button-outline"
                href={href({ view })}
              >
                {view[0].toUpperCase() + view.slice(1)} view
              </Link>
            ))}
          </nav>
        </div>
        <div className="catalog-layout">
          <aside className="filter-panel">
            <h2>What Are You Looking For?</h2>
            <form action="/cars">
              <input type="hidden" name="view" value={params.view} />
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
              <label>
                Transmission
                <select name="transmission" defaultValue={params.transmission}>
                  <option value="">All transmissions</option>
                  <option value="AUTOMATIC">Automatic</option>
                  <option value="MANUAL">Manual</option>
                </select>
              </label>
              <label>
                Fuel type
                <select name="fuel" defaultValue={params.fuel}>
                  <option value="">All fuel types</option>
                  {fuels.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </label>
              <label>
                Minimum seats
                <input
                  name="seats"
                  type="number"
                  min="1"
                  max="12"
                  defaultValue={params.seats}
                />
              </label>
              <label>
                Minimum daily price (USD)
                <input
                  name="min"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={
                    params.min === undefined ? "" : params.min / 100
                  }
                />
              </label>
              <label>
                Maximum daily price (USD)
                <input
                  name="max"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={
                    params.max === undefined ? "" : params.max / 100
                  }
                />
              </label>
              <label>
                Cars per page
                <select name="pageSize" defaultValue={params.pageSize}>
                  {[9, 12, 24].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
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
          <div>
            <div
              className={
                params.view === "list" ? "catalog-list" : "catalog-grid"
              }
            >
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
            {params.view === "map" && <CatalogMap vehicles={vehicles} />}
            <nav aria-label="Pagination" className="catalog-pagination">
              {page > 1 && (
                <Link href={href({ page: String(page - 1) })}>Previous</Link>
              )}
              <span>
                Page {page} of {pages}
              </span>
              {page < pages && (
                <Link href={href({ page: String(page + 1) })}>Next</Link>
              )}
            </nav>
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
