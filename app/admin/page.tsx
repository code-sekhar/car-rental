import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
export const metadata = {
  title: "Admin Overview",
  robots: { index: false, follow: false },
};
async function Overview() {
  const user = await requireUser();
  if (user.role !== "ADMIN") notFound();
  const [vehicles, customers, bookings, payments] = await Promise.all([
    db.vehicle.count(),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.booking.count(),
    db.payment.count(),
  ]);
  return (
    <>
      <h1>Admin Overview</h1>
      <p className="notice">
        Database and account administration foundation. Fleet, booking and
        payment management are the next operational milestones.
      </p>
      <div className="admin-stat-grid">
        {[
          ["Vehicles", vehicles],
          ["Customers", customers],
          ["Bookings", bookings],
          ["Payments", payments],
        ].map(([label, count]) => (
          <section className="account-panel" key={label}>
            <h2>{label}</h2>
            <strong className="admin-stat-number">{count}</strong>
          </section>
        ))}
      </div>
    </>
  );
}
export default function Admin() {
  return (
    <main id="main-content" className="container account-page">
      <Suspense fallback={<div className="skeleton" />}>
        <Overview />
      </Suspense>
    </main>
  );
}
