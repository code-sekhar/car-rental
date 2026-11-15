import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { bookingOptions, getBooking } from "@/lib/server/bookings";
import { InputError } from "@/lib/server/security";
import { BookingWizard } from "@/components/booking/wizard";
export const metadata = {
  title: "Your Reservation",
  robots: { index: false, follow: false },
};
async function Content({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/booking/${encodeURIComponent(id)}`);
  const { step } = await searchParams;
  const booking = await getBooking(user.id, id).catch((e) => {
    if (e instanceof InputError && e.status === 404) notFound();
    throw e;
  });
  const options = await bookingOptions(booking.vehicle.slug);
  return (
    <BookingWizard
      key={`${id}-${booking.version}-${step}`}
      options={options}
      initial={booking}
      step={step ?? "extras"}
    />
  );
}
export default function Page(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  return (
    <main id="main-content" className="bg-neutral-50">
      <section className="page-banner">
        <h1>Checkout</h1>
        <p>Complete your reservation</p>
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
