"use client";
import dynamic from "next/dynamic";
import type { Vehicle } from "@/lib/vehicle";
const Map = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <p role="status">Loading interactive map…</p>,
});
export function CatalogMap({ vehicles }: { vehicles: Vehicle[] }) {
  return <Map vehicles={vehicles} />;
}
