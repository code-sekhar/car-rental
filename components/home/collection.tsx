"use client";
import { useState, type ReactNode } from "react";
import { CarFront } from "lucide-react";
export function Collection({
  items,
}: {
  items: { brand: string; card: ReactNode }[];
}) {
  const [brand, setBrand] = useState("All Brands");
  const brands = [
    "All Brands",
    "Toyota",
    "Kia",
    "Audi",
    "Chevrolet",
    "Ford",
    "Ferrari",
  ];
  return (
    <>
      <div
        className="brand-links"
        role="group"
        aria-label="Filter popular cars by brand"
      >
        {brands.map((name) => (
          <button
            className={`brand-chip ${brand === name ? "active" : ""}`}
            key={name}
            type="button"
            aria-pressed={brand === name}
            onClick={() => setBrand(name)}
          >
            <CarFront size={22} />
            {name}
          </button>
        ))}
      </div>
      <div className="home-popular-grid" aria-live="polite">
        {items
          .filter((item) => brand === "All Brands" || item.brand === brand)
          .map((item) => item.card)}
      </div>
    </>
  );
}
