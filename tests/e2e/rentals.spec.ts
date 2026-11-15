import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";
import { randomUUID } from "node:crypto";
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    max: 2,
  }),
});
let userId: string, email: string;
const password = "RentalBrowser2026!";
const date = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10) + "T10:00";
test.beforeAll(async () => {
  email = `rental-browser-${randomUUID()}@example.test`;
  const u = await db.user.create({
    data: {
      email,
      name: "Portfolio Driver",
      passwordHash: await hash(password, {
        algorithm: 2,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      }),
      emailVerified: new Date(),
    },
  });
  userId = u.id;
});
test.afterAll(async () => {
  const bookings = await db.booking.findMany({
    where: { userId },
    select: { id: true },
  });
  const where = { bookingId: { in: bookings.map((b) => b.id) } };
  await db.cancellationRequest.deleteMany({ where });
  await db.bookingPriceSnapshot.deleteMany({ where });
  await db.booking.deleteMany({ where: { userId } });
  await db.auditLog.deleteMany({ where: { userId } });
  await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
});
test("customer creates a persisted draft, reviews server prices, holds and cancels", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const car = await db.vehicle.findFirstOrThrow({
    where: { slug: "toyota-camry" },
  });
  await page.goto(`/booking/new?vehicle=${car.slug}`);
  await expect(page).toHaveURL(/\/login/);
  const main = page.getByRole("main");
  await main.getByLabel("Email", { exact: false }).fill(email);
  await main.getByLabel("Password", { exact: true }).fill(password);
  await main.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/booking\/new/);
  await main
    .getByLabel("Pickup date and time")
    .fill(date(info.project.name === "mobile" ? 120 : 110));
  await main
    .getByLabel("Return date and time")
    .fill(date(info.project.name === "mobile" ? 122 : 112));
  await main
    .getByRole("button", { name: "Continue to Extra Services" })
    .click();
  await expect(page).toHaveURL(/step=extras/);
  const id = page.url().match(/booking\/([^?]+)/)![1];
  await main.getByRole("checkbox", { name: /GPS Navigation/ }).check();
  await main
    .getByRole("button", { name: "Continue to Driver Details" })
    .click();
  await expect(page).toHaveURL(/step=driver/);
  await page.reload();
  await main.getByLabel("First name").fill("Portfolio");
  await main.getByLabel("Last name").fill("Driver");
  await main.getByLabel("Driver age").fill("30");
  await main.getByLabel("Phone number").fill("+15551234567");
  await main
    .getByLabel("Driving license number", { exact: true })
    .fill("TEST-LICENSE-42");
  await main.getByRole("checkbox", { name: /confirm the driver/ }).check();
  await main
    .getByLabel("Insurance plan")
    .selectOption({ label: "Full Premium Insurance · $20/day" });
  await main
    .getByRole("button", { name: "Review Booking", exact: true })
    .click();
  await expect(page).toHaveURL(/step=review/);
  await expect(
    main.getByRole("heading", { name: "Review Your Booking" }),
  ).toBeVisible();
  await main.getByLabel("Coupon code").fill("WELCOME10");
  await main.getByRole("button", { name: "Apply Coupon" }).click();
  await expect(
    main.getByRole("button", { name: "Reserve Temporary Hold" }),
  ).toBeEnabled();
  await page.screenshot({
    path: `docs/screenshots/booking-review-${info.project.name}.png`,
    fullPage: true,
  });
  await main.getByRole("button", { name: "Reserve Temporary Hold" }).click();
  await expect(
    main.getByRole("heading", { name: "Vehicle temporarily held" }),
  ).toBeVisible();
  await expect(
    main.getByRole("button", { name: "Payment unavailable" }),
  ).toBeDisabled();
  const b = await db.booking.findUniqueOrThrow({
    where: { id },
    include: {
      priceSnapshot: true,
      extras: true,
      driver: true,
      payments: true,
    },
  });
  expect(b.status).toBe("PENDING_PAYMENT");
  expect(b.userId).toBe(userId);
  expect(b.priceSnapshot!.discountCents).toBeGreaterThan(0);
  expect(b.extras.length).toBe(1);
  expect(b.payments).toHaveLength(0);
  expect(b.driver!.encryptedLicense).not.toContain("TEST-LICENSE-42");
  await main.getByRole("link", { name: "View Booking Details" }).click();
  await expect(
    main.getByText("PENDING_PAYMENT", { exact: true }),
  ).toBeVisible();
  await main.getByLabel("Cancellation reason").fill("Travel plans changed");
  await main.getByRole("button", { name: "Submit Cancellation" }).click();
  await expect(main.getByText("CANCELLED", { exact: true })).toBeVisible();
  await expect(main.getByText("Cancellation: APPROVED")).toBeVisible();
  await page.goto("/dashboard/bookings");
  await expect(
    main.getByRole("link", { name: new RegExp(b.reference) }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  const size = await page.evaluate(() => ({
    w: innerWidth,
    doc: document.documentElement.scrollWidth,
  }));
  expect(size.doc).toBeLessThanOrEqual(size.w);
  await page.screenshot({
    path: `docs/screenshots/my-bookings-${info.project.name}.png`,
    fullPage: true,
  });
});
test("catalog pagination, views, combined filters and invalid dates", async ({
  page,
}, info) => {
  await page.goto("/cars?sort=price-asc&pageSize=9&fuel=Diesel");
  const main = page.getByRole("main");
  await expect(main.getByLabel("Fuel type")).toHaveValue("Diesel");
  await main.getByRole("link", { name: "List view", exact: true }).click();
  await expect(page).toHaveURL(/view=list/);
  await expect(main.locator(".catalog-list")).toBeVisible();
  await main.getByRole("link", { name: "Map view", exact: true }).click();
  await expect(page).toHaveURL(/fuel=Diesel/);
  await expect(
    main.getByRole("heading", { name: "No mapped pickup locations" }),
  ).toBeVisible();
  await page.goto("/cars?sort=price-asc&pageSize=9");
  await main
    .getByRole("navigation", { name: "Pagination", exact: true })
    .getByRole("link", { name: "Next", exact: true })
    .click();
  await expect(page).toHaveURL(/page=2/);
  await expect(main.getByText("Page 2 of 2")).toBeVisible();
  await main.getByRole("link", { name: "List view", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.screenshot({
    path: `docs/screenshots/catalog-list-${info.project.name}.png`,
    fullPage: true,
  });
  await page.goto(
    "/cars?location=Miami&pickup=2020-01-01T10:00&return=2020-01-02T10:00",
  );
  await expect(main.getByRole("alert")).toContainText("future");
  const response = await page.request.post("/api/bookings", {
    data: {},
    headers: { origin: "http://127.0.0.1:3100" },
  });
  expect(response.status()).toBe(401);
});

test("interactive map uses stored fixture coordinates and vehicle popups", async ({
  page,
}, info) => {
  const car = await db.vehicle.findUniqueOrThrow({
    where: {
      slug: info.project.name === "mobile" ? "mercedes-benz" : "bmw-640",
    },
  });
  const location = await db.rentalLocation.create({
    data: {
      name: `Map test fixture ${randomUUID()}`,
      address: "Isolated browser fixture, not a rental branch",
      city: "London",
      countryCode: "GB",
      timeZone: "Europe/London",
      latitude: 51.5074,
      longitude: -0.1278,
      isDemo: true,
    },
  });
  try {
    await db.vehicle.update({
      where: { id: car.id },
      data: { locationId: location.id },
    });
    // Exercise Leaflet and stored records without depending on a third party tile service in CI.
    await page.route("https://tile.openstreetmap.org/**", (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#eef5f6"/></svg>',
      }),
    );
    await page.goto(
      `/cars?view=map&location=${encodeURIComponent(location.name)}`,
    );
    const map = page.getByRole("region", { name: "Vehicle location map" });
    await expect(
      map.getByRole("link", { name: "OpenStreetMap", exact: true }),
    ).toBeVisible();
    await expect(map.locator(".leaflet-marker-icon")).toHaveCount(1);
    await map.locator(".leaflet-marker-icon").click();
    await expect(map.locator(".leaflet-popup").getByRole("link")).toContainText(
      car.name,
    );
    await map.getByRole("button", { name: "Zoom in" }).click();
    await page.screenshot({
      path: `docs/screenshots/catalog-map-fixture-${info.project.name}.png`,
      fullPage: true,
    });
  } finally {
    await db.vehicle.update({
      where: { id: car.id },
      data: { locationId: car.locationId },
    });
    await db.rentalLocation.delete({ where: { id: location.id } });
  }
});
