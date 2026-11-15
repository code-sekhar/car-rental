export type PriceLine = {
  serviceId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  perDay: boolean;
  totalCents: number;
};
export type RentalPrice = {
  currency: string;
  days: number;
  dailyRateCents: number;
  baseCents: number;
  extrasCents: number;
  insuranceCents: number;
  deliveryCents: number;
  discountCents: number;
  taxCents: number;
  depositCents: number;
  totalCents: number;
  taxRateBps: number;
  pricingVersion: number;
  couponCode: string | null;
  lines: PriceLine[];
};
const max = 2_000_000_000n;
function cents(v: number) {
  if (!Number.isSafeInteger(v) || v < 0)
    throw new Error("Invalid monetary value.");
  return BigInt(v);
}
function checked(v: bigint) {
  if (v < 0 || v > max)
    throw new Error("Rental amount exceeds the supported limit.");
  return Number(v);
}
/** Both tax and percentage discounts round half up to the nearest minor unit. */
export function roundBps(amount: number, bps: number) {
  if (!Number.isInteger(bps) || bps < 0 || bps > 10000)
    throw new Error("Invalid percentage rate.");
  return checked((cents(amount) * BigInt(bps) + 5000n) / 10000n);
}
export function calculatePrice(input: {
  currency: string;
  days: number;
  dailyRateCents: number;
  extras: {
    serviceId: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
    perDay: boolean;
  }[];
  insurancePerDayCents: number;
  deliveryCents: number;
  depositCents: number;
  taxRateBps: number;
  pricingVersion: number;
  coupon?: { code: string; kind: "PERCENT" | "FIXED"; value: number };
}): RentalPrice {
  if (!Number.isSafeInteger(input.days) || input.days < 1 || input.days > 365)
    throw new Error("Invalid rental duration.");
  const baseCents = checked(cents(input.dailyRateCents) * BigInt(input.days));
  const lines = input.extras.map((v) => {
    if (!Number.isInteger(v.quantity) || v.quantity < 1 || v.quantity > 4)
      throw new Error("Invalid service quantity.");
    return {
      ...v,
      totalCents: checked(
        cents(v.unitPriceCents) *
          BigInt(v.quantity) *
          BigInt(v.perDay ? input.days : 1),
      ),
    };
  });
  const extrasCents = checked(
    lines.reduce((sum, v) => sum + cents(v.totalCents), 0n),
  );
  const insuranceCents = checked(
    cents(input.insurancePerDayCents) * BigInt(input.days),
  );
  const deliveryCents = checked(cents(input.deliveryCents));
  const depositCents = checked(cents(input.depositCents));
  const subtotal = checked(
    cents(baseCents) +
      cents(extrasCents) +
      cents(insuranceCents) +
      cents(deliveryCents),
  );
  const rawDiscount = input.coupon
    ? input.coupon.kind === "PERCENT"
      ? roundBps(subtotal, input.coupon.value)
      : checked(cents(input.coupon.value))
    : 0;
  const discountCents = Math.min(subtotal, rawDiscount);
  const taxCents = roundBps(subtotal - discountCents, input.taxRateBps);
  return {
    currency: input.currency,
    days: input.days,
    dailyRateCents: input.dailyRateCents,
    baseCents,
    extrasCents,
    insuranceCents,
    deliveryCents,
    depositCents,
    discountCents,
    taxCents,
    totalCents: checked(
      cents(subtotal) -
        cents(discountCents) +
        cents(taxCents) +
        cents(depositCents),
    ),
    taxRateBps: input.taxRateBps,
    pricingVersion: input.pricingVersion,
    couponCode: input.coupon?.code ?? null,
    lines,
  };
}
