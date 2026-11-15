import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import type { Vehicle } from "@/lib/vehicle";
const include = {
  brand: true,
  category: true,
  location: true,
  images: { orderBy: { position: "asc" as const }, take: 1 },
};
type Record = Prisma.VehicleGetPayload<{ include: typeof include }>;
function present(v: Record): Vehicle {
  return {
    id: v.id,
    slug: v.slug,
    name: v.name,
    description: v.description,
    brand: v.brand.name,
    category: v.category.name,
    location: v.location.name,
    image: v.images[0]?.url ?? "/brand/veltrix-mark.svg",
    transmission: v.transmission === "AUTOMATIC" ? "Automatic" : "Manual",
    fuel: v.fuel,
    seats: v.seats,
    year: v.year,
    mileageKm: v.mileageKm,
    dailyPriceCents: v.dailyPriceCents,
    featured: v.featured,
    isDemo: v.isDemo,
    avatarUrl: v.representativeImageUrl ?? undefined,
  };
}
export async function homeInventory() {
  "use cache";
  cacheLife("minutes");
  cacheTag("inventory");
  const records = await db.vehicle.findMany({
    where: { status: "PUBLISHED" },
    include,
    orderBy: { displayOrder: "asc" },
    take: 100,
  });
  return {
    demoVehicles: records.map(present),
    popularVehicles: records
      .filter((v) => v.popular)
      .slice(0, 8)
      .map(present),
    recommendedVehicles: records
      .filter((v) => v.recommended)
      .sort(
        (a, b) =>
          (a.recommendationOrder ?? 100) - (b.recommendationOrder ?? 100),
      )
      .map(present),
  };
}
export async function vehicleBySlug(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("inventory");
  const record = await db.vehicle.findFirst({
    where: { slug, status: "PUBLISHED" },
    include,
  });
  return record ? present(record) : null;
}
export async function catalog(params: {
  location: string;
  brand: string;
  category: string;
  q: string;
  sort: string;
}) {
  const where: Prisma.VehicleWhereInput = {
    status: "PUBLISHED",
    ...(params.location ? { location: { name: params.location } } : {}),
    ...(params.brand ? { brand: { name: params.brand } } : {}),
    ...(params.category ? { category: { name: params.category } } : {}),
    ...(params.q ? { name: { contains: params.q, mode: "insensitive" } } : {}),
  };
  const [records, total, brands, categories, locations] = await Promise.all([
    db.vehicle.findMany({
      where,
      include,
      orderBy:
        params.sort === "price-asc"
          ? { dailyPriceCents: "asc" }
          : params.sort === "price-desc"
            ? { dailyPriceCents: "desc" }
            : { displayOrder: "asc" },
      take: 100,
    }),
    db.vehicle.count({ where: { status: "PUBLISHED" } }),
    db.vehicleBrand.findMany({
      orderBy: { name: "asc" },
      select: { name: true },
    }),
    db.vehicleCategory.findMany({
      orderBy: { name: "asc" },
      select: { name: true },
    }),
    db.rentalLocation.findMany({
      where: { active: true },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    vehicles: records.map(present),
    total,
    brands: brands.map((v) => v.name),
    categories: categories.map((v) => v.name),
    locations: locations.map((v) => v.name),
  };
}
