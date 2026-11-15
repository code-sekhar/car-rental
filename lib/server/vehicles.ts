import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { parseCatalog } from "@/lib/rental/catalog";
import { availableWhere, checkedPeriod } from "./availability";
import { InputError } from "./security";
import type { Vehicle } from "@/lib/vehicle";
const include = {
  brand: true,
  category: true,
  location: true,
  images: { orderBy: { position: "asc" as const }, take: 1 },
};
type VehicleRecord = Prisma.VehicleGetPayload<{ include: typeof include }>;
function present(v: VehicleRecord): Vehicle {
  return {
    id: v.id,
    latitude: v.location.latitude,
    longitude: v.location.longitude,
    locationId: v.locationId,
    timeZone: v.location.timeZone,
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
  const locations = await db.rentalLocation.findMany({
    where: { active: true },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  return {
    locations: locations.map((l) => l.name),
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
export async function catalog(
  raw: Record<string, string | string[] | undefined>,
) {
  const params = parseCatalog(raw);
  const where: Prisma.VehicleWhereInput = {
    status: "PUBLISHED",
    ...(params.location
      ? { location: { name: params.location, active: true } }
      : {}),
    ...(params.brand ? { brand: { name: params.brand } } : {}),
    ...(params.category ? { category: { name: params.category } } : {}),
    ...(params.q ? { name: { contains: params.q, mode: "insensitive" } } : {}),
    ...(params.fuel ? { fuel: params.fuel } : {}),
    ...(params.transmission ? { transmission: params.transmission } : {}),
    ...(params.seats ? { seats: { gte: params.seats } } : {}),
    dailyPriceCents: { gte: params.min, lte: params.max },
  };
  if (params.pickup) {
    const location = await db.rentalLocation.findFirst({
      where: { name: params.location, active: true },
    });
    if (!location) throw new InputError("Choose a valid rental location.");
    const period = await checkedPeriod({
      pickupLocationId: location.id,
      returnLocationId: location.id,
      pickupLocal: params.pickup,
      returnLocal: params.return,
    });
    Object.assign(where, availableWhere(period.pickupAt, period.returnAt));
  }
  const [total, brands, categories, locations, fuels] = await Promise.all([
    db.vehicle.count({ where }),
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
    db.vehicle.findMany({
      where: { status: "PUBLISHED" },
      distinct: ["fuel"],
      select: { fuel: true },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / params.pageSize)),
    page = Math.min(params.page, pages);
  const orderBy: Prisma.VehicleOrderByWithRelationInput[] =
    params.sort === "price-asc"
      ? [{ dailyPriceCents: "asc" }]
      : params.sort === "price-desc"
        ? [{ dailyPriceCents: "desc" }]
        : params.sort === "newest"
          ? [{ createdAt: "desc" }]
          : [{ displayOrder: "asc" }];
  orderBy.push({ id: "asc" });
  const records = await db.vehicle.findMany({
    where,
    include,
    orderBy,
    skip: (page - 1) * params.pageSize,
    take: params.pageSize,
  });
  return {
    vehicles: records.map(present),
    total,
    page,
    pages,
    params,
    brands: brands.map((v) => v.name),
    categories: categories.map((v) => v.name),
    locations: locations.map((v) => v.name),
    fuels: fuels.map((v) => v.fuel),
  };
}
