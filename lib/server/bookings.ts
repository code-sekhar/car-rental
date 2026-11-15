import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { InputError, hashToken, encryptPrivate } from "./security";
import {
  assertAvailable,
  checkedPeriod,
  expireBookings,
  policy,
  type Tx,
} from "./availability";
import {
  draftSchema,
  updateDraftSchema,
  holdSchema,
  cancelSchema,
  quoteSelectionSchema,
} from "@/lib/rental/validation";
import { calculatePrice, type RentalPrice } from "@/lib/rental/pricing";
import { localDateTime } from "@/lib/rental/period";
const include = {
  vehicle: {
    include: { images: { orderBy: { position: "asc" as const }, take: 1 } },
  },
  pickupLocation: true,
  returnLocation: true,
  extras: { include: { service: true } },
  driver: true,
  insurancePlan: true,
  priceSnapshot: true,
  cancellationRequest: true,
  payments: { select: { status: true } },
} satisfies Prisma.BookingInclude;
type FullBooking = Prisma.BookingGetPayload<{ include: typeof include }>;
async function customer(tx: Tx, userId: string) {
  const u = await tx.user.findFirst({
    where: { id: userId, disabledAt: null, emailVerified: { not: null } },
  });
  if (!u) throw new InputError("Sign in to manage your booking.", 401);
  return u;
}
async function owned(tx: Tx, userId: string, id: string) {
  const b = await tx.booking.findFirst({ where: { id, userId }, include });
  if (!b) throw new InputError("Booking not found.", 404);
  return b;
}
/** Consistent parent-first locking serializes reservations and availability edits. */
async function locked<T>(
  userId: string,
  id: string,
  fn: (tx: Tx, b: FullBooking) => Promise<T>,
): Promise<T> {
  return db.$transaction(
    async (tx) => {
      await customer(tx, userId);
      const hint = await tx.booking.findFirst({
        where: { id, userId },
        select: { vehicleId: true },
      });
      if (!hint) throw new InputError("Booking not found.", 404);
      await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id=${hint.vehicleId} FOR UPDATE`;
      await expireBookings(tx, hint.vehicleId);
      const b = await owned(tx, userId, id);
      return fn(tx, b);
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
function editable(b: FullBooking, version: number) {
  if (b.status !== "DRAFT")
    throw new InputError("This booking can no longer be edited.", 409);
  if (b.version !== version)
    throw new InputError(
      "This booking changed in another tab. Reload before continuing.",
      409,
    );
}
async function quote(
  tx: Tx,
  b: FullBooking,
  selection?: unknown,
): Promise<RentalPrice> {
  const p = await policy(tx);
  const requested = selection ? quoteSelectionSchema.parse(selection) : {};
  const selected =
    requested.extras ??
    b.extras.map((e) => ({
      serviceId: e.extraServiceId,
      quantity: e.quantity,
    }));
  const services = await tx.extraService.findMany({
    where: { id: { in: selected.map((e) => e.serviceId) }, active: true },
  });
  if (services.length !== selected.length)
    throw new InputError(
      "One of the selected services is no longer available.",
      409,
    );
  if (b.driver?.chauffeur && !services.some((s) => s.code === "chauffeur"))
    throw new InputError("Add the acting driver service before continuing.");
  const insuranceId =
    requested.insurancePlanId === undefined
      ? b.insurancePlanId
      : requested.insurancePlanId;
  const insurance = insuranceId
    ? await tx.insurancePlan.findFirst({
        where: { id: insuranceId, active: true },
      })
    : null;
  if (insuranceId && !insurance)
    throw new InputError("Choose an available insurance plan.");
  const days = Math.ceil(
    (b.returnAt.getTime() - b.pickupAt.getTime()) / 86400000,
  );
  const base = {
    currency: b.vehicle.currency,
    days,
    dailyRateCents: b.vehicle.dailyPriceCents,
    extras: services
      .sort((a, c) => a.id.localeCompare(c.id))
      .map((s) => ({
        serviceId: s.id,
        name: s.name,
        quantity: selected.find((e) => e.serviceId === s.id)!.quantity,
        unitPriceCents: s.priceCents,
        perDay: s.perDay,
      })),
    insurancePerDayCents: insurance?.pricePerDayCents ?? 0,
    deliveryCents: b.delivery ? b.vehicle.deliveryFeeCents : 0,
    depositCents: b.vehicle.depositCents,
    taxRateBps: p.taxRateBps,
    pricingVersion: p.version,
  };
  if (p.currency !== base.currency)
    throw new InputError(
      "Vehicle currency is not supported by the pricing policy.",
      409,
    );
  let coupon;
  if (b.requestedCouponCode) {
    const c = await tx.coupon.findUnique({
      where: { code: b.requestedCouponCode },
    });
    const now = new Date();
    const preliminary = calculatePrice(base);
    if (
      !c ||
      !c.active ||
      c.startsAt > now ||
      c.expiresAt <= now ||
      preliminary.baseCents +
        preliminary.extrasCents +
        preliminary.insuranceCents +
        preliminary.deliveryCents <
        c.minimumCents
    )
      throw new InputError("This coupon cannot be used for this rental.");
    const uses = await tx.booking.count({
      where: {
        couponId: c.id,
        id: { not: b.id },
        OR: [
          { status: { in: ["CONFIRMED", "ACTIVE", "COMPLETED"] } },
          { status: "PENDING_PAYMENT", holdExpiresAt: { gt: now } },
        ],
      },
    });
    if (c.maxUses !== null && uses >= c.maxUses)
      throw new InputError("This coupon has reached its usage limit.");
    coupon = {
      code: c.code,
      kind: c.kind,
      value: c.kind === "PERCENT" ? c.discountBps! : c.fixedAmountCents!,
    };
  }
  return calculatePrice({ ...base, coupon });
}
function snapshotPrice(b: FullBooking): RentalPrice | null {
  const s = b.priceSnapshot;
  if (!s) return null;
  return {
    ...s,
    couponCode: (s.couponSnapshot as { code?: string } | null)?.code ?? null,
    lines: b.extras.map((e) => ({
      serviceId: e.extraServiceId,
      name: e.nameSnapshot,
      quantity: e.quantity,
      unitPriceCents: e.unitPriceCents,
      perDay: e.perDaySnapshot,
      totalCents: e.totalCents,
    })),
  };
}
const fingerprint = (b: FullBooking, p: RentalPrice) =>
  hashToken(JSON.stringify({ version: b.version, price: p }));
function view(
  b: FullBooking,
  price: RentalPrice | null,
  quoteError: string | null = null,
) {
  return {
    id: b.id,
    reference: b.reference,
    status: b.status,
    version: b.version,
    pickupAt: b.pickupAt.toISOString(),
    returnAt: b.returnAt.toISOString(),
    pickupLocal: localDateTime(b.pickupAt, b.pickupLocation.timeZone),
    returnLocal: localDateTime(b.returnAt, b.returnLocation.timeZone),
    pickupLocationId: b.pickupLocationId,
    returnLocationId: b.returnLocationId,
    pickupLocation: b.pickupLocation.name,
    returnLocation: b.returnLocation.name,
    pickupZone: b.pickupLocation.timeZone,
    returnZone: b.returnLocation.timeZone,
    delivery: b.delivery,
    holdExpiresAt: b.holdExpiresAt?.toISOString() ?? null,
    vehicle: {
      slug: b.vehicle.slug,
      name: b.vehicle.name,
      image: b.vehicle.images[0]?.url ?? "/brand/veltrix-mark.svg",
    },
    extras: b.extras.map((e) => ({
      serviceId: e.extraServiceId,
      quantity: e.quantity,
    })),
    insurancePlanId: b.insurancePlanId,
    couponCode: b.requestedCouponCode ?? "",
    driver: b.driver
      ? {
          firstName: b.driver.firstName,
          lastName: b.driver.lastName,
          age: b.driver.age,
          phone: b.driver.phone,
          chauffeur: b.driver.chauffeur,
          hasLicense: Boolean(b.driver.encryptedLicense),
          ageConfirmed: Boolean(b.driver.ageConfirmedAt),
        }
      : null,
    price,
    quoteHash: price ? fingerprint(b, price) : null,
    quoteError,
    cancellation: b.cancellationRequest?.status ?? null,
    paymentStatus:
      b.payments.find((p) =>
        ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(p.status),
      )?.status ??
      b.payments.find(() => true)?.status ??
      "NOT_STARTED",
  };
}
export type BookingView = ReturnType<typeof view>;
export async function bookingOptions(slug: string) {
  const [vehicle, locations, extras, insurance, p] = await Promise.all([
    db.vehicle.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: {
        slug: true,
        name: true,
        locationId: true,
        dailyPriceCents: true,
        currency: true,
      },
    }),
    db.rentalLocation.findMany({
      where: { active: true },
      select: { id: true, name: true, timeZone: true },
      orderBy: { name: "asc" },
    }),
    db.extraService.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    db.insurancePlan.findMany({
      where: { active: true },
      orderBy: { pricePerDayCents: "asc" },
    }),
    policy(),
  ]);
  if (!vehicle) throw new InputError("Vehicle not found.", 404);
  return {
    vehicle,
    locations,
    extras,
    insurance,
    policy: { maxDays: p.maxRentalDays, holdMinutes: p.holdMinutes },
  };
}
export type BookingOptions = Awaited<ReturnType<typeof bookingOptions>>;
export async function createDraft(userId: string, input: unknown) {
  const v = draftSchema.parse(input);
  const key = hashToken(`${userId}:${v.idempotencyKey}`),
    requestHash = hashToken(
      JSON.stringify({ ...v, idempotencyKey: undefined }),
    );
  const vehicle = await db.vehicle.findUnique({
    where: { slug: v.vehicleSlug },
    select: { id: true },
  });
  if (!vehicle) throw new InputError("Vehicle not found.", 404);
  return db.$transaction(async (tx) => {
    await customer(tx, userId);
    await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id=${vehicle.id} FOR UPDATE`;
    const existing = await tx.booking.findUnique({
      where: { idempotencyKey: key },
      include,
    });
    if (existing) {
      if (
        existing.userId !== userId ||
        existing.initialRequestHash !== requestHash
      )
        throw new InputError(
          "This submission key was already used for different details.",
          409,
        );
      return { id: existing.id };
    }
    const period = await checkedPeriod(v, tx);
    const car = await tx.vehicle.findUniqueOrThrow({
      where: { id: vehicle.id },
    });
    if (car.locationId !== v.pickupLocationId)
      throw new InputError(
        "Choose this vehicle’s pickup area. Delivery is available within that area.",
      );
    await expireBookings(tx, vehicle.id);
    await assertAvailable(tx, vehicle.id, period.pickupAt, period.returnAt);
    const b = await tx.booking.create({
      data: {
        reference: `VR-${randomBytes(8).toString("hex").toUpperCase()}`,
        idempotencyKey: key,
        initialRequestHash: requestHash,
        userId,
        vehicleId: vehicle.id,
        pickupLocationId: v.pickupLocationId,
        returnLocationId: v.returnLocationId,
        pickupAt: period.pickupAt,
        returnAt: period.returnAt,
        delivery: v.delivery,
        draftExpiresAt: new Date(Date.now() + 86400000),
      },
    });
    return { id: b.id };
  });
}
export async function getBooking(userId: string, id: string) {
  return locked(userId, id, async (tx, b) => {
    if (b.status !== "DRAFT") return view(b, snapshotPrice(b));
    let price: RentalPrice | null = null;
    let quoteError: string | null = null;
    try {
      price = await quote(tx, b);
    } catch (e) {
      if (e instanceof InputError && e.status < 500) quoteError = e.message;
      else throw e;
    }
    return view(b, price, quoteError);
  });
}
export async function quoteBooking(userId: string, id: string, input: unknown) {
  return locked(userId, id, async (tx, b) => {
    if (b.status !== "DRAFT")
      throw new InputError("This booking is no longer editable.", 409);
    const p = await quote(tx, b, input);
    return { price: p, quoteHash: fingerprint(b, p) };
  });
}
export async function updateBooking(
  userId: string,
  id: string,
  input: unknown,
) {
  const v = updateDraftSchema.parse(input);
  return locked(userId, id, async (tx, b) => {
    editable(b, v.version);
    if (v.kind === "period") {
      const p = await checkedPeriod(v, tx);
      if (v.pickupLocationId !== b.vehicle.locationId)
        throw new InputError("Choose the vehicle’s pickup area.");
      await assertAvailable(tx, b.vehicleId, p.pickupAt, p.returnAt);
      await tx.booking.update({
        where: { id },
        data: {
          pickupAt: p.pickupAt,
          returnAt: p.returnAt,
          pickupLocationId: v.pickupLocationId,
          returnLocationId: v.returnLocationId,
          delivery: v.delivery,
        },
      });
    }
    if (v.kind === "extras") {
      const services = await tx.extraService.findMany({
        where: { id: { in: v.extras.map((e) => e.serviceId) }, active: true },
      });
      if (services.length !== v.extras.length)
        throw new InputError("Choose available extra services.");
      await tx.bookingExtra.deleteMany({ where: { bookingId: id } });
      for (const e of v.extras) {
        const s = services.find((s) => s.id === e.serviceId)!;
        await tx.bookingExtra.create({
          data: {
            bookingId: id,
            extraServiceId: s.id,
            nameSnapshot: s.name,
            perDaySnapshot: s.perDay,
            unitPriceCents: s.priceCents,
            quantity: e.quantity,
            totalCents: 0,
          },
        });
      }
    }
    if (v.kind === "driver") {
      if (
        v.insurancePlanId &&
        !(await tx.insurancePlan.findFirst({
          where: { id: v.insurancePlanId, active: true },
        }))
      )
        throw new InputError("Choose an available insurance plan.");
      const { license, ageConfirmed, ...driver } = v.driver;
      const data = {
        ...driver,
        ageConfirmedAt: ageConfirmed ? new Date() : null,
        encryptedLicense: license
          ? encryptPrivate(license, "driver-license")
          : null,
      };
      await tx.bookingDriver.upsert({
        where: { bookingId: id },
        create: { bookingId: id, ...data },
        update: data,
      });
      await tx.booking.update({
        where: { id },
        data: { insurancePlanId: v.insurancePlanId },
      });
      const chauffeur = await tx.extraService.findUnique({
        where: { code: "chauffeur" },
      });
      if (v.driver.chauffeur) {
        if (!chauffeur?.active)
          throw new InputError("Chauffeur service is unavailable.");
        await tx.bookingExtra.upsert({
          where: {
            bookingId_extraServiceId: {
              bookingId: id,
              extraServiceId: chauffeur.id,
            },
          },
          create: {
            bookingId: id,
            extraServiceId: chauffeur.id,
            nameSnapshot: chauffeur.name,
            unitPriceCents: chauffeur.priceCents,
            perDaySnapshot: chauffeur.perDay,
            quantity: 1,
            totalCents: 0,
          },
          update: { quantity: 1 },
        });
      } else if (chauffeur)
        await tx.bookingExtra.deleteMany({
          where: { bookingId: id, extraServiceId: chauffeur.id },
        });
    }
    if (v.kind === "coupon")
      await tx.booking.update({
        where: { id },
        data: { requestedCouponCode: v.code || null },
      });
    await tx.booking.update({
      where: { id },
      data: { version: { increment: 1 } },
    });
    const updated = await owned(tx, userId, id);
    const p = await quote(tx, updated);
    return view(updated, p);
  });
}
export async function holdBooking(userId: string, id: string, input: unknown) {
  const v = holdSchema.parse(input);
  return locked(userId, id, async (tx, b) => {
    if (b.status === "PENDING_PAYMENT") return view(b, snapshotPrice(b));
    editable(b, v.version);
    if (
      !b.driver ||
      !b.driver.ageConfirmedAt ||
      (!b.driver.chauffeur && !b.driver.encryptedLicense)
    )
      throw new InputError("Complete driver details before reserving.");
    await checkedPeriod(
      {
        pickupLocationId: b.pickupLocationId,
        returnLocationId: b.returnLocationId,
        pickupLocal: localDateTime(b.pickupAt, b.pickupLocation.timeZone),
        returnLocal: localDateTime(b.returnAt, b.returnLocation.timeZone),
      },
      tx,
    );
    if (b.pickupAt <= new Date())
      throw new InputError("Pickup must be in the future.");
    if (b.requestedCouponCode)
      await tx.$queryRaw`SELECT id FROM "Coupon" WHERE code=${b.requestedCouponCode} FOR UPDATE`;
    const p = await quote(tx, b);
    if (fingerprint(b, p) !== v.quoteHash)
      throw new InputError(
        "The price has changed. Reload and review your updated quote.",
        409,
      );
    await assertAvailable(tx, b.vehicleId, b.pickupAt, b.returnAt);
    const config = await policy(tx);
    const coupon = b.requestedCouponCode
      ? await tx.coupon.findUnique({ where: { code: b.requestedCouponCode } })
      : null;
    const { lines, couponCode, ...snapshot } = p;
    await tx.bookingPriceSnapshot.create({
      data: {
        bookingId: id,
        ...snapshot,
        couponSnapshot: couponCode ? { code: couponCode } : Prisma.JsonNull,
      },
    });
    for (const line of lines)
      await tx.bookingExtra.update({
        where: {
          bookingId_extraServiceId: {
            bookingId: id,
            extraServiceId: line.serviceId,
          },
        },
        data: {
          nameSnapshot: line.name,
          unitPriceCents: line.unitPriceCents,
          quantity: line.quantity,
          perDaySnapshot: line.perDay,
          totalCents: line.totalCents,
        },
      });
    await tx.booking.update({
      where: { id },
      data: {
        status: "PENDING_PAYMENT",
        holdExpiresAt: new Date(Date.now() + config.holdMinutes * 60000),
        couponId: coupon?.id,
        version: { increment: 1 },
      },
    });
    await tx.auditLog.create({
      data: {
        userId,
        action: "BOOKING_HELD",
        entityType: "Booking",
        entityId: id,
      },
    });
    await tx.notification.create({
      data: {
        userId,
        title: "Temporary rental hold",
        body: `${b.reference} is held for ${config.holdMinutes} minutes. Payment has not been taken.`,
      },
    });
    const updated = await owned(tx, userId, id);
    return view(updated, snapshotPrice(updated));
  });
}
export async function cancelBooking(
  userId: string,
  id: string,
  input: unknown,
) {
  const v = cancelSchema.parse(input);
  return locked(userId, id, async (tx, b) => {
    if (b.cancellationRequest) return { status: b.cancellationRequest.status };
    if (!["DRAFT", "PENDING_PAYMENT", "CONFIRMED", "ACTIVE"].includes(b.status))
      throw new InputError("This booking cannot be cancelled.", 409);
    const immediate = b.status === "DRAFT" || b.status === "PENDING_PAYMENT";
    // Even an unexpected successful provider record must go through review/refund handling.
    const paid = await tx.payment.count({
      where: {
        bookingId: id,
        status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED", "PROCESSING"] },
      },
    });
    const approved = immediate && !paid;
    await tx.cancellationRequest.create({
      data: {
        bookingId: id,
        userId,
        reason: v.reason,
        status: approved ? "APPROVED" : "REQUESTED",
        reviewedAt: approved ? new Date() : null,
      },
    });
    if (approved)
      await tx.booking.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          version: { increment: 1 },
        },
      });
    await tx.auditLog.create({
      data: {
        userId,
        action: approved ? "BOOKING_CANCELLED" : "CANCELLATION_REQUESTED",
        entityType: "Booking",
        entityId: id,
      },
    });
    return { status: approved ? "APPROVED" : "REQUESTED" };
  });
}
export async function myBookings(userId: string, page = 1) {
  await customer(db, userId);
  await expireBookings(db);
  const total = await db.booking.count({ where: { userId } });
  const pages = Math.max(1, Math.ceil(total / 10));
  const current = Math.min(Math.max(1, page), pages);
  const records = await db.booking.findMany({
    where: { userId },
    include: { vehicle: { select: { name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 10,
    skip: (current - 1) * 10,
  });
  return { records, total, page: current, pages };
}
