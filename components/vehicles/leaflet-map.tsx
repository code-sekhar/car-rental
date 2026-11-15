"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Vehicle } from "@/lib/vehicle";
export default function VehicleMap({ vehicles }: { vehicles: Vehicle[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const located = vehicles.filter(
    (v) =>
      Number.isFinite(v.latitude) &&
      Number.isFinite(v.longitude) &&
      Math.abs(v.latitude!) <= 90 &&
      Math.abs(v.longitude!) <= 180,
  );
  useEffect(() => {
    if (!ref.current || !located.length) return;
    const map = L.map(ref.current).setView(
      [located[0].latitude!, located[0].longitude!],
      10,
    );
    L.tileLayer(
      process.env.NEXT_PUBLIC_MAP_TILE_URL ||
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      },
    ).addTo(map);
    const points: L.LatLngExpression[] = [];
    located.forEach((v) => {
      const point: L.LatLngExpression = [v.latitude!, v.longitude!];
      points.push(point);
      const link = document.createElement("a");
      link.href = `/cars/${v.slug}`;
      link.textContent = `${v.name} · ${v.location}`;
      L.marker(point, {
        icon: L.divIcon({
          html: "<span aria-hidden='true'>●</span>",
          className: "rental-map-pin",
          iconSize: [24, 24],
        }),
      })
        .addTo(map)
        .bindPopup(link);
    });
    if (points.length > 1)
      map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 12 });
    return () => {
      map.remove();
    };
    // Rebuild only when the server-provided result set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles]);
  if (!located.length)
    return (
      <div className="empty-state">
        <h2>No mapped pickup locations</h2>
        <p>
          These records do not have verified coordinates. Browse the vehicle
          cards or choose another location.
        </p>
      </div>
    );
  return (
    <section aria-label="Vehicle location map">
      <p>
        {located.length} mapped vehicles. {vehicles.length - located.length}{" "}
        without coordinates.
      </p>
      <div ref={ref} className="rental-map" />
    </section>
  );
}
