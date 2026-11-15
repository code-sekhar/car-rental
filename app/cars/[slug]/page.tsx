import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { money } from "@/lib/vehicle";
import { vehicleBySlug } from "@/lib/server/vehicles";
import { db } from "@/lib/server/db";
export async function generateStaticParams() {
  return db.vehicle.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
    take: 100,
  });
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await vehicleBySlug(slug);
  return {
    title: vehicle?.name ?? "Car Not Found",
    description: vehicle
      ? `Explore the ${vehicle.name}: ${vehicle.seats} seats, ${vehicle.transmission.toLowerCase()} transmission. Demonstration vehicle preview.`
      : undefined,
  };
}
export default async function CarDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vehicle = await vehicleBySlug(slug);
  if (!vehicle) notFound();
  return (
    <main id="main-content" className="bg-neutral-50">
      <section className="page-banner">
        <div className="container">
          <h1>Car Details</h1>
          <p>
            <Link href="/">Home</Link> / <Link href="/cars">Cars</Link> /{" "}
            <span>{vehicle.name}</span>
          </p>
        </div>
      </section>
      <div className="container detail-wrap">
        <div className="detail-title">
          <p>
            {vehicle.category} · {vehicle.year}
          </p>
          <h1>{vehicle.name}</h1>
          <p>{vehicle.location}, USA · Demonstration vehicle</p>
        </div>
        <div className="detail-grid">
          <div>
            <div className="detail-photo">
              <Image
                src={vehicle.image}
                alt={vehicle.name}
                fill
                preload
                sizes="(max-width: 800px) 100vw, 66vw"
              />
            </div>
            <section className="detail-description">
              <h2>About this vehicle</h2>
              <p>{vehicle.description}</p>
            </section>
          </div>
          <aside className="detail-panel">
            <h2>Vehicle Information</h2>
            <dl>
              {[
                ["Brand", vehicle.brand],
                ["Category", vehicle.category],
                ["Transmission", vehicle.transmission],
                ["Fuel", vehicle.fuel],
                ["Capacity", `${vehicle.seats} persons`],
                ["Model year", vehicle.year],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="detail-rate">
              {money(vehicle.dailyPriceCents)}
              <small> / Day</small>
            </p>
            <p className="notice">
              Indicative base rate. Availability, extras, deposits and final
              totals are not yet connected. Reservations are disabled during
              Phase 1.
            </p>
            <button className="button button-primary w-full" disabled>
              Booking coming soon
            </button>
            <Link className="button button-outline w-full mt-3" href="/cars">
              Back to All Cars
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
