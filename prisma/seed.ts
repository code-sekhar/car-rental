import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";
import {
  demoVehicles,
  popularVehicles,
  recommendedVehicles,
} from "../lib/demo-vehicles";
const url = process.env.DATABASE_URL;
if (
  !url ||
  process.env.DEMO_SEED !== "true" ||
  !/(development|demo|test)/i.test(new URL(url).pathname)
)
  throw new Error(
    "Demo seed requires DEMO_SEED=true and a dedicated development/demo/test database.",
  );
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url, max: 2 }),
});
async function main() {
  for (const [name, timeZone, address] of [
    ["Miami", "America/New_York", "Demonstration pickup area in Miami"],
    ["New York", "America/New_York", "Demonstration pickup area in New York"],
    [
      "Los Angeles",
      "America/Los_Angeles",
      "Demonstration pickup area in Los Angeles",
    ],
  ])
    await db.rentalLocation.upsert({
      where: { name },
      create: {
        name,
        city: name,
        address,
        countryCode: "US",
        timeZone,
        isDemo: true,
      },
      update: {},
    });
  for (const [index, v] of demoVehicles.entries()) {
    const brand = await db.vehicleBrand.upsert({
      where: { name: v.brand },
      create: {
        name: v.brand,
        slug: v.brand.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-"),
      },
      update: {},
    });
    const category = await db.vehicleCategory.upsert({
      where: { name: v.category },
      create: { name: v.category, slug: v.category.toLowerCase() },
      update: {},
    });
    const location = await db.rentalLocation.findUniqueOrThrow({
      where: { name: v.location },
    });
    const prior = await db.vehicle.findUnique({ where: { slug: v.slug } });
    if (prior && !prior.isDemo)
      throw new Error("Refusing to overwrite non-demo inventory");
    await db.vehicle.upsert({
      where: { slug: v.slug },
      create: {
        slug: v.slug,
        name: v.name,
        description: `${v.name}: ${v.seats} seats and ${v.transmission.toLowerCase()} transmission. This vehicle is development demonstration inventory.`,
        brandId: brand.id,
        categoryId: category.id,
        locationId: location.id,
        status: "PUBLISHED",
        transmission: v.transmission === "Automatic" ? "AUTOMATIC" : "MANUAL",
        fuel: v.fuel,
        seats: v.seats,
        year: v.year,
        mileageKm: v.mileageKm ?? 10,
        dailyPriceCents: v.dailyPriceCents,
        isDemo: true,
        featured: v.featured ?? false,
        popular: popularVehicles.some((p) => p.slug === v.slug),
        representativeImageUrl: v.avatar
          ? `/images/home/avatar-${v.avatar}.webp`
          : null,
        recommendationOrder: recommendedVehicles.findIndex(
          (p) => p.slug === v.slug,
        ),
        recommended: recommendedVehicles.some((p) => p.slug === v.slug),
        displayOrder:
          popularVehicles.findIndex((p) => p.slug === v.slug) >= 0
            ? popularVehicles.findIndex((p) => p.slug === v.slug)
            : 100 + index,
        images: { create: { url: v.image, alt: v.name, position: 0 } },
      },
      update: {
        featured: v.featured ?? false,
        popular: popularVehicles.some((p) => p.slug === v.slug),
        representativeImageUrl: v.avatar
          ? `/images/home/avatar-${v.avatar}.webp`
          : null,
        recommendationOrder: recommendedVehicles.findIndex(
          (p) => p.slug === v.slug,
        ),
      },
    });
  }
  for (const [code, name, priceCents, perDay] of [
    ["gps", "GPS Navigation", 2500, true],
    ["wifi", "Wi-Fi Hotspot", 2500, true],
    ["child-seat", "Child Safety Seat", 5000, false],
    ["fuel", "Fuel Option", 7500, false],
    ["additional-driver", "Additional Driver", 2000, true],
  ] as const)
    await db.extraService.upsert({
      where: { code },
      create: {
        code,
        name,
        description: `Optional ${name.toLowerCase()} service`,
        priceCents,
        perDay,
      },
      update: {},
    });
  await db.insurancePlan.upsert({
    where: { code: "premium" },
    create: {
      code: "premium",
      name: "Full Premium Insurance",
      pricePerDayCents: 2000,
    },
    update: {},
  });
  for (const [email, name, role, password] of [
    ["customer@veltrix.test", "Demo Customer", "CUSTOMER", "VeltrixDemo!2026"],
    ["admin@veltrix.test", "Demo Administrator", "ADMIN", "VeltrixAdmin!2026"],
  ] as const) {
    const passwordHash = await hash(password, {
      algorithm: 2 /* Argon2id */,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    await db.user.upsert({
      where: { email },
      create: {
        email,
        name,
        role,
        passwordHash,
        emailVerified: new Date(),
        isDemo: true,
      },
      update: {},
    });
  }
  console.log(
    `Seeded ${await db.vehicle.count({ where: { isDemo: true } })} demo vehicles, 3 locations and dedicated demo accounts. Existing records were preserved.`,
  );
}
main().finally(() => db.$disconnect());
