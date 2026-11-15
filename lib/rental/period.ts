import { Temporal } from "@js-temporal/polyfill";
export type RentalPeriod = { pickupAt: Date; returnAt: Date; days: number };
/** Local wall-clock values require an explicit location zone; DST gaps/folds are rejected. */
export function rentalPeriod(
  pickup: string,
  returnAt: string,
  pickupZone: string,
  returnZone: string,
  rules: { maxDays: number; maxAdvanceDays: number },
  now = Date.now(),
): RentalPeriod {
  let start: number, end: number;
  try {
    start = Number(
      Temporal.PlainDateTime.from(pickup)
        .toZonedDateTime(pickupZone, { disambiguation: "reject" })
        .toInstant().epochMilliseconds,
    );
    end = Number(
      Temporal.PlainDateTime.from(returnAt)
        .toZonedDateTime(returnZone, { disambiguation: "reject" })
        .toInstant().epochMilliseconds,
    );
  } catch {
    throw new Error(
      "Choose valid local times. Ambiguous or missing daylight-saving times are not accepted.",
    );
  }
  if (start <= now) throw new Error("Pickup must be in the future.");
  if (end <= start) throw new Error("Return must be after pickup.");
  if (start - now > rules.maxAdvanceDays * 86400000)
    throw new Error(`Book no more than ${rules.maxAdvanceDays} days ahead.`);
  const days = Math.ceil((end - start) / 86400000);
  if (days > rules.maxDays)
    throw new Error(`A rental may last at most ${rules.maxDays} days.`);
  return { pickupAt: new Date(start), returnAt: new Date(end), days };
}
export function periodsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
) {
  return aStart < bEnd && bStart < aEnd;
}
export function localDateTime(instant: Date, zone: string) {
  return Temporal.Instant.from(instant.toISOString())
    .toZonedDateTimeISO(zone)
    .toPlainDateTime()
    .toString({ smallestUnit: "minute" });
}
