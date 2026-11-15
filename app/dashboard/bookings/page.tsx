import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/server/auth";
import { myBookings } from "@/lib/server/bookings";
async function List({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUser();
  const n = Number((await searchParams).page) || 1;
  const { records, page, pages } = await myBookings(
    user.id,
    Number.isSafeInteger(n) ? n : 1,
  );
  return (
    <section className="booking-panel">
      <h1>My Bookings</h1>
      <Link href="/dashboard">My Account</Link>
      {records.length ? (
        records.map((b) => (
          <article className="extra-service" key={b.id}>
            <Link href={`/dashboard/bookings/${b.id}`}>
              {b.reference} · {b.vehicle.name}
            </Link>
            <p>
              {b.status} · {b.pickupAt.toISOString().slice(0, 10)}
            </p>
          </article>
        ))
      ) : (
        <p>
          No bookings yet. <Link href="/cars">Explore Cars</Link>
        </p>
      )}
      <nav aria-label="Booking pagination" className="catalog-pagination">
        {page > 1 && <Link href={`?page=${page - 1}`}>Previous</Link>}
        <span>
          Page {page} of {pages}
        </span>
        {page < pages && <Link href={`?page=${page + 1}`}>Next</Link>}
      </nav>
    </section>
  );
}
export default function Page(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  return (
    <main id="main-content" className="container booking-page">
      <Suspense fallback={<div className="skeleton" />}>
        <List {...props} />
      </Suspense>
    </main>
  );
}
