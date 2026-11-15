import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/server/auth";
import { myBookings } from "@/lib/server/bookings";
import { db } from "@/lib/server/db";
import { SignOutButton } from "@/components/auth/sign-out";
export const metadata = {
  title: "My Account",
  robots: { index: false, follow: false },
};
async function Account() {
  const user = await requireUser();
  const [bookings, notifications, sessions] = await Promise.all([
    myBookings(user.id),
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.session.count({
      where: { userId: user.id, expires: { gt: new Date() } },
    }),
  ]);
  return (
    <>
      <div className="account-heading">
        <div>
          <p className="eyebrow">MY VELTRIX ACCOUNT</p>
          <h1>Welcome, {user.name ?? "driver"}</h1>
          <p>Your account and rental information, in one place.</p>
        </div>
        <SignOutButton />
      </div>
      <div className="account-grid">
        <section className="account-panel">
          <h2>My Profile</h2>
          <dl>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Status</dt>
            <dd>Email verified</dd>
            <dt>Active sessions</dt>
            <dd>{sessions}</dd>
          </dl>
          {user.isDemo && (
            <p className="notice">Dedicated demonstration account</p>
          )}
          {user.role === "ADMIN" && (
            <Link className="button button-dark" href="/admin">
              Admin Dashboard
            </Link>
          )}
        </section>
        <section className="account-panel">
          <h2>My Bookings</h2>
          <Link href="/dashboard/bookings">View All Bookings</Link>
          {bookings.records.length ? (
            <ul>
              {bookings.records.map((booking) => (
                <li key={booking.id}>
                  <Link href={`/dashboard/bookings/${booking.id}`}>
                    <strong>{booking.reference}</strong>
                  </Link>{" "}
                  · {booking.vehicle.name} · {booking.status}
                  <p>
                    {booking.pickupAt.toISOString().slice(0, 10)} ·{" "}
                    {[
                      "DRAFT",
                      "PENDING_PAYMENT",
                      "CONFIRMED",
                      "ACTIVE",
                    ].includes(booking.status)
                      ? "Upcoming / in progress"
                      : "History"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="account-empty">
              <p>You don’t have any bookings yet.</p>
              <Link className="button button-dark" href="/cars">
                Explore Cars
              </Link>
            </div>
          )}
        </section>
        <section className="account-panel">
          <h2>Notifications</h2>
          {notifications.length ? (
            <ul>
              {notifications.map((note) => (
                <li key={note.id}>
                  <strong>{note.title}</strong>
                  <p>{note.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No notifications yet.</p>
          )}
        </section>
      </div>
    </>
  );
}
export default function Dashboard() {
  return (
    <main id="main-content" className="container account-page">
      <Suspense
        fallback={
          <div className="skeleton" aria-label="Loading your account" />
        }
      >
        <Account />
      </Suspense>
    </main>
  );
}
