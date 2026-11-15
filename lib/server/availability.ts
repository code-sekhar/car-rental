import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { rentalPeriod } from "@/lib/rental/period";
import { db } from "./db";
import { InputError } from "./security";
export type Tx = Prisma.TransactionClient;
export function availableWhere(
  start: Date,
  end: Date,
  now = new Date(),
): Prisma.VehicleWhereInput {
  return {
    availability: { none: { startsAt: { lt: end }, endsAt: { gt: start } } },
    bookings: {
      none: {
        pickupAt: { lt: end },
        returnAt: { gt: start },
        OR: [
          { status: { in: ["CONFIRMED", "ACTIVE"] } },
          { status: "PENDING_PAYMENT", holdExpiresAt: { gt: now } },
        ],
      },
    },
  };
}
export async function policy(tx: Tx = db) {
  const p = await tx.pricingPolicy.findUnique({ where: { id: "standard" } });
  if (!p) throw new InputError("Rental pricing has not been configured.", 503);
  return p;
}
export async function expireBookings(tx: Tx = db, vehicleId?: string) {
  return tx.booking.updateMany({
    where: {
      vehicleId,
      OR: [
        { status: "PENDING_PAYMENT", holdExpiresAt: { lte: new Date() } },
        { status: "DRAFT", draftExpiresAt: { lte: new Date() } },
      ],
    },
    data: { status: "EXPIRED", version: { increment: 1 } },
  });
}
export async function checkedPeriod(
  input: {
    pickupLocationId: string;
    returnLocationId: string;
    pickupLocal: string;
    returnLocal: string;
  },
  tx: Tx = db,
) {
  const pickup = await tx.rentalLocation.findFirst({
    where: { id: input.pickupLocationId, active: true },
  });
  const returned = await tx.rentalLocation.findFirst({
    where: { id: input.returnLocationId, active: true },
  });
  const p = await policy(tx);
  if (!pickup || !returned)
    throw new InputError("Choose active pickup and return locations.");
  try {
    return {
      ...rentalPeriod(
        input.pickupLocal,
        input.returnLocal,
        pickup.timeZone,
        returned.timeZone,
        { maxDays: p.maxRentalDays, maxAdvanceDays: p.maxAdvanceDays },
      ),
      pickup,
      returned,
      p,
    };
  } catch (error) {
    throw new InputError(
      error instanceof Error ? error.message : "Invalid rental period.",
    );
  }
}
export async function assertAvailable(
  tx: Tx,
  vehicleId: string,
  start: Date,
  end: Date,
) {
  const found = await tx.vehicle.findFirst({
    where: {
      id: vehicleId,
      status: "PUBLISHED",
      ...availableWhere(start, end),
    },
    select: { id: true },
  });
  if (!found)
    throw new InputError(
      "This vehicle is unavailable for the selected period. Please choose different dates.",
      409,
    );
}
