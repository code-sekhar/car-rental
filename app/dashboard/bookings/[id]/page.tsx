import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { getBooking } from "@/lib/server/bookings";
import { InputError } from "@/lib/server/security";
import { PriceSummary } from "@/components/booking/wizard";
import { CancelBooking } from "@/components/booking/cancel";
export const metadata = {
  title: "Booking Details",
  robots: { index: false, follow: false },
};
async function Content({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const b = await getBooking(user.id, (await params).id).catch((e) => {
    if (e instanceof InputError && e.status === 404) notFound();
    throw e;
  });
  return (
    <section className="booking-panel">
      <Link href="/dashboard">Back to My Account</Link>
      <h1>Booking {b.reference}</h1>
      <h2>{b.vehicle.name}</h2>
      <p>
        Status: <strong>{b.status}</strong>
      </p>
      <p>
        Payment:{" "}
        {b.paymentStatus === "NOT_STARTED"
          ? "No verified payment"
          : b.paymentStatus}
      </p>
      <p>
        Pickup: {b.pickupLocation} · {b.pickupLocal.replace("T", " ")} (
        {b.pickupZone})
      </p>
      <p>
        Return: {b.returnLocation} · {b.returnLocal.replace("T", " ")} (
        {b.returnZone})
      </p>
      {b.driver && (
        <p>
          Driver: {b.driver.firstName} {b.driver.lastName}
        </p>
      )}
      <PriceSummary price={b.price} />
      {["DRAFT", "PENDING_PAYMENT"].includes(b.status) && (
        <Link
          className="button button-primary"
          href={`/booking/${b.id}?step=${b.status === "DRAFT" ? "extras" : "reservation"}`}
        >
          Resume Reservation
        </Link>
      )}
      {b.cancellation ? (
        <p>Cancellation: {b.cancellation}</p>
      ) : (
        ["DRAFT", "PENDING_PAYMENT", "CONFIRMED", "ACTIVE"].includes(
          b.status,
        ) && <CancelBooking id={b.id} />
      )}
    </section>
  );
}
export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <main id="main-content" className="container booking-page">
      <Suspense
        fallback={<div className="skeleton" aria-label="Loading booking" />}
      >
        <Content {...props} />
      </Suspense>
    </main>
  );
}
