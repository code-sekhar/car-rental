import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Fuel,
  Gauge,
  MapPin,
  Settings2,
  UsersRound,
  LifeBuoy,
  Snowflake,
  Star,
} from "lucide-react";
import { money, type Vehicle } from "@/lib/vehicle";
import { ShortlistButton } from "./shortlist-button";
export function VehicleCard({
  vehicle,
  recommended = false,
}: {
  vehicle: Vehicle;
  recommended?: boolean;
}) {
  return (
    <article
      className={`vehicle-card ${recommended ? "vehicle-recommended" : ""}`}
    >
      <div className="vehicle-photo-wrap">
        <Link
          className="vehicle-photo"
          href={`/cars/${vehicle.slug}`}
          tabIndex={-1}
          aria-hidden="true"
        >
          <Image
            src={vehicle.image}
            alt=""
            fill
            sizes={
              recommended
                ? "(max-width: 600px) 100vw, 33vw"
                : "(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 25vw"
            }
          />
          {!recommended && (
            <span className="vehicle-brand">{vehicle.brand}</span>
          )}
        </Link>
        <ShortlistButton name={vehicle.name} slug={vehicle.slug} />
        {!recommended && (vehicle.featured || vehicle.topRated) && (
          <span
            className={`vehicle-ribbon ${vehicle.topRated ? "ribbon-orange" : ""}`}
          >
            {vehicle.topRated ? "Top Rated" : "Featured"}
          </span>
        )}
        {!recommended && (vehicle.avatarUrl || vehicle.avatar) && (
          <Image
            className="vehicle-avatar"
            src={vehicle.avatarUrl ?? `/images/home/avatar-${vehicle.avatar}.webp`}
            alt="Sample rental representative"
            width={36}
            height={36}
          />
        )}
        {recommended && (
          <span className="recommended-price">
            {money(vehicle.dailyPriceCents)} /day
          </span>
        )}
      </div>
      <div className="vehicle-card-body">
        {recommended && <SampleRating />}
        <h3>
          <Link href={`/cars/${vehicle.slug}`}>{vehicle.name}</Link>
        </h3>
        {!recommended && <SampleRating />}
        <div className="vehicle-specs">
          <span>
            <Settings2 />
            {vehicle.transmission === "Automatic" ? "Auto" : "Manual"}
          </span>
          <span>
            <Gauge />
            {vehicle.mileageKm ?? 10} KM
          </span>
          <span>
            <Fuel />
            {vehicle.fuel}
          </span>
          <span>
            <LifeBuoy />
            Power
          </span>
          <span>
            {recommended ? <Snowflake /> : <CalendarDays />}
            {recommended ? "AC" : vehicle.year}
          </span>
          <span>
            <UsersRound />
            {vehicle.seats} Persons
          </span>
        </div>
        {!recommended && (
          <div className="vehicle-price">
            <span>
              <MapPin size={14} />
              {vehicle.location}, USA
            </span>
            <div>
              <strong>{money(vehicle.dailyPriceCents)}</strong>
              <small> / Day</small>
            </div>
          </div>
        )}
        <Link
          href={`/cars/${vehicle.slug}`}
          className="button button-dark w-full"
        >
          <CalendarDays size={15} />
          View Car
        </Link>
      </div>
    </article>
  );
}
function SampleRating() {
  return (
    <div
      className="sample-rating"
      aria-label="Illustrative rating, not a verified customer rating"
    >
      <span aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            size={14}
            fill="currentColor"
            className={i === 4 ? "star-muted" : ""}
          />
        ))}
      </span>
      <small>Sample rating</small>
    </div>
  );
}
