import { beforeAll, afterAll, it, expect, describe } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "../../lib/server/db";
import { catalog } from "../../lib/server/vehicles";
import {
  createDraft,
  getBooking,
  updateBooking,
  holdBooking,
  cancelBooking,
} from "../../lib/server/bookings";
import { localDateTime } from "../../lib/rental/period";
import { expireBookings } from "../../lib/server/availability";
let user: string,
  other: string,
  car: Awaited<ReturnType<typeof db.vehicle.findFirstOrThrow>>,
  location: Awaited<ReturnType<typeof db.rentalLocation.findFirstOrThrow>>;
const bookingIds: string[] = [];
let held: string;
const local = (days: number) =>
  localDateTime(new Date(Date.now() + days * 86400000), "America/New_York");
async function draft(days = 20, key = randomUUID()) {
  const result = await createDraft(user, {
    vehicleSlug: car.slug,
    idempotencyKey: key,
    pickupLocationId: location.id,
    returnLocationId: location.id,
    pickupLocal: local(days),
    returnLocal: local(days + 2),
    delivery: true,
  });
  if (!bookingIds.includes(result.id)) bookingIds.push(result.id);
  return result.id;
}
async function driver(id: string) {
  let b = await getBooking(user, id);
  b = await updateBooking(user, id, {
    kind: "driver",
    version: b.version,
    driver: {
      firstName: "Rental",
      lastName: "Tester",
      age: 30,
      phone: "+15551234567",
      chauffeur: false,
      license: "TEST12345",
      ageConfirmed: true,
    },
    insurancePlanId: null,
  });
  return b;
}
beforeAll(async () => {
  const u = await db.user.create({
    data: {
      email: `rental-${randomUUID()}@example.test`,
      emailVerified: new Date(),
      name: "Rental Tester",
    },
  });
  user = u.id;
  other = (
    await db.user.create({
      data: {
        email: `other-${randomUUID()}@example.test`,
        emailVerified: new Date(),
      },
    })
  ).id;
  const template = await db.vehicle.findFirstOrThrow({
    where: { status: "PUBLISHED" },
  });
  location = await db.rentalLocation.findUniqueOrThrow({
    where: { id: template.locationId },
  });
  car = await db.vehicle.create({
    data: {
      slug: `test-${randomUUID()}`,
      name: "Integration Rental",
      description: "Isolated integration fixture",
      brandId: template.brandId,
      categoryId: template.categoryId,
      locationId: location.id,
      status: "PUBLISHED",
      transmission: "AUTOMATIC",
      fuel: "Test fuel",
      seats: 7,
      year: 2026,
      mileageKm: 0,
      dailyPriceCents: 12345,
      isDemo: true,
    },
  });
});
afterAll(async () => {
  const where = { bookingId: { in: bookingIds } };
  await db.cancellationRequest.deleteMany({ where });
  await db.bookingPriceSnapshot.deleteMany({ where });
  await db.booking.deleteMany({ where: { id: { in: bookingIds } } });
  await db.auditLog.deleteMany({ where: { userId: { in: [user, other] } } });
  await db.user.deleteMany({ where: { id: { in: [user, other] } } });
  await db.vehicleAvailability.deleteMany({ where: { vehicleId: car.id } });
  await db.vehicle.delete({ where: { id: car.id } });
  await db.$disconnect();
});
describe("PostgreSQL catalog", () => {
  it("combines name, brand, category, location, price, fuel, transmission and seats", async () => {
    const brand = await db.vehicleBrand.findUniqueOrThrow({
        where: { id: car.brandId },
      }),
      category = await db.vehicleCategory.findUniqueOrThrow({
        where: { id: car.categoryId },
      });
    const result = await catalog({
      q: "Integration Rental",
      brand: brand.name,
      category: category.name,
      location: location.name,
      min: "123.45",
      max: "123.45",
      fuel: "Test fuel",
      transmission: "AUTOMATIC",
      seats: "7",
    });
    expect(result.total).toBe(1);
    expect(result.vehicles[0].id).toBe(car.id);
    expect((await catalog({ q: "Integration Rental", min: "124" })).total).toBe(
      0,
    );
  });
  it("paginates on the server and sorts stably", async () => {
    const first = await catalog({ pageSize: "9", sort: "price-asc" });
    const second = await catalog({
      pageSize: "9",
      page: "2",
      sort: "price-asc",
    });
    expect(first.vehicles.length).toBe(9);
    expect(first.total).toBeGreaterThan(9);
    expect(
      first.vehicles.some((a) => second.vehicles.some((b) => a.id === b.id)),
    ).toBe(false);
    const all = [...first.vehicles, ...second.vehicles];
    expect(all.map((v) => v.dailyPriceCents)).toEqual(
      all.map((v) => v.dailyPriceCents).sort((a, b) => a - b),
    );
    expect((await catalog({ page: "99999" })).page).toBe(first.pages);
  });
});
describe("transactional booking lifecycle", () => {
  it("rejects invalid and unauthorized creation", async () => {
    await expect(createDraft("missing", {})).rejects.toThrow();
    await expect(
      createDraft(user, {
        vehicleSlug: car.slug,
        idempotencyKey: randomUUID(),
        pickupLocationId: location.id,
        returnLocationId: location.id,
        pickupLocal: local(21),
        returnLocal: local(20),
        delivery: false,
      }),
    ).rejects.toThrow("Return");
  });
  it("is idempotent for duplicate concurrent submissions", async () => {
    const key = randomUUID();
    const results = await Promise.all([draft(20, key), draft(20, key)]);
    expect(results[0]).toBe(results[1]);
  });
  it("enforces ownership and optimistic versions", async () => {
    const id = bookingIds[0];
    await expect(getBooking(other, id)).rejects.toThrow("not found");
    await expect(
      cancelBooking(other, id, { reason: "Not mine" }),
    ).rejects.toThrow("not found");
    await expect(
      updateBooking(user, id, { kind: "coupon", version: 99, code: "" }),
    ).rejects.toThrow("another tab");
  });
  it("encrypts license data and requires server reviewed prices", async () => {
    const id = bookingIds[0];
    const b = await driver(id);
    const saved = await db.bookingDriver.findUniqueOrThrow({
      where: { bookingId: id },
    });
    expect(saved.encryptedLicense).not.toContain("TEST12345");
    expect(JSON.stringify(b)).not.toContain("TEST12345");
    expect(b.price!.baseCents).toBe(24690);
    await expect(
      holdBooking(user, id, { version: b.version, quoteHash: "0".repeat(64) }),
    ).rejects.toThrow("price has changed");
  });
  it("allows only one concurrent overlapping hold and preserves historical prices", async () => {
    const first = await driver(bookingIds[0]);
    const second = await driver(await draft());
    const result = await Promise.allSettled([
      holdBooking(user, first.id, {
        version: first.version,
        quoteHash: first.quoteHash,
      }),
      holdBooking(user, second.id, {
        version: second.version,
        quoteHash: second.quoteHash,
      }),
    ]);
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    held = (
      result.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<
        Awaited<ReturnType<typeof holdBooking>>
      >
    ).value.id;
    const before = await getBooking(user, held);
    expect(before.status).toBe("PENDING_PAYMENT");
    expect(await db.payment.count({ where: { bookingId: held } })).toBe(0);
    await db.vehicle.update({
      where: { id: car.id },
      data: { dailyPriceCents: 99999 },
    });
    expect((await getBooking(user, held)).price!.totalCents).toBe(
      before.price!.totalCents,
    );
    const again = await holdBooking(user, held, {
      version: 0,
      quoteHash: "0".repeat(64),
    });
    expect(again.id).toBe(held);
    expect(
      await db.bookingPriceSnapshot.count({ where: { bookingId: held } }),
    ).toBe(1);
  });
  it("filters active holds and detects maintenance blocks", async () => {
    expect(
      (
        await catalog({
          q: car.name,
          location: location.name,
          pickup: local(20),
          return: local(22),
        })
      ).total,
    ).toBe(0);
    const b = await getBooking(user, held);
    await expect(
      db.vehicleAvailability.create({
        data: {
          vehicleId: car.id,
          startsAt: new Date(b.pickupAt),
          endsAt: new Date(b.returnAt),
          kind: "MAINTENANCE",
        },
      }),
    ).rejects.toThrow();
  });
  it("cancels an unpaid hold, releases availability, and records ownership", async () => {
    expect(
      await cancelBooking(user, held, { reason: "Travel plans changed" }),
    ).toEqual({ status: "APPROVED" });
    expect((await getBooking(user, held)).status).toBe("CANCELLED");
    expect(
      (
        await catalog({
          q: car.name,
          location: location.name,
          pickup: local(20),
          return: local(22),
        })
      ).total,
    ).toBe(1);
  });
  it("expires stale holds on access and permits a fresh reservation", async () => {
    const b = await driver(await draft(30));
    const hold = await holdBooking(user, b.id, {
      version: b.version,
      quoteHash: b.quoteHash,
    });
    await db.booking.update({
      where: { id: hold.id },
      data: { holdExpiresAt: new Date(Date.now() - 1000) },
    });
    expect((await getBooking(user, hold.id)).status).toBe("EXPIRED");
    const next = await driver(await draft(30));
    expect(
      (
        await holdBooking(user, next.id, {
          version: next.version,
          quoteHash: next.quoteHash,
        })
      ).status,
    ).toBe("PENDING_PAYMENT");
  });
  it("expires drafts and refuses to reserve them", async () => {
    const id = await draft(40);
    await db.booking.update({
      where: { id },
      data: { draftExpiresAt: new Date(0) },
    });
    await expireBookings(db, car.id);
    expect((await getBooking(user, id)).status).toBe("EXPIRED");
    await expect(
      holdBooking(user, id, { version: 0, quoteHash: "0".repeat(64) }),
    ).rejects.toThrow("no longer");
  });
  it("checks maintenance at draft creation and rejects invalid locations", async () => {
    const start = new Date(Date.now() + 50 * 86400000),
      end = new Date(Date.now() + 53 * 86400000);
    await db.vehicleAvailability.create({
      data: {
        vehicleId: car.id,
        startsAt: start,
        endsAt: end,
        kind: "BLOCKED",
      },
    });
    await expect(draft(51)).rejects.toThrow("unavailable");
    const otherLocation = await db.rentalLocation.findFirstOrThrow({
      where: { id: { not: location.id }, active: true },
    });
    await expect(
      createDraft(user, {
        vehicleSlug: car.slug,
        idempotencyKey: randomUUID(),
        pickupLocationId: otherLocation.id,
        returnLocationId: location.id,
        pickupLocal: local(60),
        returnLocal: local(62),
        delivery: true,
      }),
    ).rejects.toThrow("pickup area");
  });
});

it("permits half-open adjacent reservations and checks blocks again at hold time", async () => {
  const first = await driver(await draft(65));
  const one = await holdBooking(user, first.id, {
    version: first.version,
    quoteHash: first.quoteHash,
  });
  const second = await driver(await draft(67));
  expect(
    (
      await holdBooking(user, second.id, {
        version: second.version,
        quoteHash: second.quoteHash,
      })
    ).status,
  ).toBe("PENDING_PAYMENT");
  expect(one.status).toBe("PENDING_PAYMENT");
  const waiting = await driver(await draft(70));
  await db.vehicleAvailability.create({
    data: {
      vehicleId: car.id,
      startsAt: new Date(waiting.pickupAt),
      endsAt: new Date(waiting.returnAt),
      kind: "MAINTENANCE",
    },
  });
  await expect(
    holdBooking(user, waiting.id, {
      version: waiting.version,
      quoteHash: waiting.quoteHash,
    }),
  ).rejects.toThrow("unavailable");
});
it("sends paid/confirmed cancellations to review without releasing or refunding", async () => {
  const b = await driver(await draft(75));
  await holdBooking(user, b.id, { version: b.version, quoteHash: b.quoteHash });
  await db.booking.update({
    where: { id: b.id },
    data: { status: "CONFIRMED" },
  });
  expect(
    await cancelBooking(user, b.id, {
      reason: "Please review my cancellation",
    }),
  ).toEqual({ status: "REQUESTED" });
  expect((await getBooking(user, b.id)).status).toBe("CONFIRMED");
  expect(
    await db.refund.count({ where: { payment: { bookingId: b.id } } }),
  ).toBe(0);
});
it("validates extras, coupons and reprices against current inventory", async () => {
  const id = await draft(85);
  let b = await getBooking(user, id);
  await expect(
    updateBooking(user, id, {
      kind: "extras",
      version: b.version,
      extras: [{ serviceId: "missing-service", quantity: 1 }],
    }),
  ).rejects.toThrow("available");
  await expect(
    updateBooking(user, id, {
      kind: "coupon",
      version: b.version,
      code: "UNKNOWN",
    }),
  ).rejects.toThrow("coupon");
  b = await driver(id);
  await db.vehicle.update({
    where: { id: car.id },
    data: { dailyPriceCents: 88888 },
  });
  await expect(
    holdBooking(user, id, { version: b.version, quoteHash: b.quoteHash }),
  ).rejects.toThrow("price has changed");
});
it("keeps a stale-coupon draft editable instead of failing its private page", async () => {
  const id = await draft(90);
  const b = await getBooking(user, id);
  await db.booking.update({
    where: { id },
    data: { requestedCouponCode: "REMOVED_COUPON" },
  });
  const stale = await getBooking(user, id);
  expect(stale.quoteError).toContain("coupon");
  expect(stale.quoteHash).toBeNull();
  const recovered = await updateBooking(user, id, {
    kind: "coupon",
    version: b.version,
    code: "",
  });
  expect(recovered.price).not.toBeNull();
});
it("enforces the exclusion constraint even when a caller bypasses service locks", async () => {
  const a = await draft(95),
    b = await draft(95);
  const attempts = await Promise.allSettled([
    db.booking.update({ where: { id: a }, data: { status: "CONFIRMED" } }),
    db.booking.update({ where: { id: b }, data: { status: "CONFIRMED" } }),
  ]);
  expect(attempts.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(attempts.filter((r) => r.status === "rejected")).toHaveLength(1);
});
