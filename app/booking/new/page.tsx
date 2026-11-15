import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { bookingOptions } from "@/lib/server/bookings";
import { InputError } from "@/lib/server/security";
import { BookingWizard } from "@/components/booking/wizard";
export const metadata = {
  title: "Reserve a Car",
  robots: { index: false, follow: false },
};
async function Content({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const slug = typeof params.vehicle === "string" ? params.vehicle : "";
  await requireUser(`/booking/new?vehicle=${encodeURIComponent(slug)}`);
  const options = await bookingOptions(slug).catch((e) => {
    if (e instanceof InputError && e.status === 404) notFound();
    throw e;
  });
  return (
    <BookingWizard
      key={slug}
      options={options}
      initial={null}
      step="location"
    />
  );
}
export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <main id="main-content" className="bg-neutral-50">
      <section className="page-banner">
        <h1>Checkout</h1>
        <p>Reserve Your Car</p>
      </section>
      <div className="container booking-page">
        <Suspense
          fallback={
            <div className="skeleton" aria-label="Loading reservation" />
          }
        >
          <Content {...props} />
        </Suspense>
      </div>
    </main>
  );
}
