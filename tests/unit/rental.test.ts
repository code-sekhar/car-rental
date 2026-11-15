import { describe, it, expect } from "vitest";
import { rentalPeriod, periodsOverlap } from "../../lib/rental/period";
import { calculatePrice, roundBps } from "../../lib/rental/pricing";
import { parseCatalog } from "../../lib/rental/catalog";
const rules = { maxDays: 30, maxAdvanceDays: 365 };
const now = Date.parse("2026-01-01T00:00:00Z");
describe("rental periods", () => {
  it("uses location time zones and rounds started 24-hour periods upward", () => {
    const p = rentalPeriod(
      "2026-02-01T10:00",
      "2026-02-02T10:01",
      "America/New_York",
      "America/New_York",
      rules,
      now,
    );
    expect(p.pickupAt.toISOString()).toBe("2026-02-01T15:00:00.000Z");
    expect(p.days).toBe(2);
  });
  it("accounts for DST elapsed duration", () => {
    expect(
      rentalPeriod(
        "2026-03-07T12:00",
        "2026-03-08T12:00",
        "America/New_York",
        "America/New_York",
        rules,
        now,
      ).days,
    ).toBe(1);
  });
  it("rejects missing and ambiguous local times", () => {
    for (const value of ["2026-03-08T02:30", "2026-11-01T01:30"])
      expect(() =>
        rentalPeriod(
          value,
          "2026-11-02T12:00",
          "America/New_York",
          "America/New_York",
          rules,
          now,
        ),
      ).toThrow("daylight-saving");
  });
  it("rejects past, reversed, too long and too distant periods", () => {
    for (const [a, b] of [
      ["2025-12-01T10:00", "2025-12-02T10:00"],
      ["2026-02-02T10:00", "2026-02-01T10:00"],
      ["2026-02-01T10:00", "2026-04-01T10:00"],
      ["2028-02-01T10:00", "2028-02-02T10:00"],
    ])
      expect(() => rentalPeriod(a, b, "UTC", "UTC", rules, now)).toThrow();
  });
  it("allows adjacent half-open periods", () => {
    expect(
      periodsOverlap(new Date(0), new Date(10), new Date(10), new Date(20)),
    ).toBe(false);
    expect(
      periodsOverlap(new Date(0), new Date(11), new Date(10), new Date(20)),
    ).toBe(true);
  });
});
const base = {
  currency: "USD",
  days: 2,
  dailyRateCents: 10000,
  extras: [
    {
      serviceId: "gps",
      name: "GPS",
      quantity: 2,
      unitPriceCents: 125,
      perDay: true,
    },
  ],
  insurancePerDayCents: 500,
  deliveryCents: 6000,
  depositCents: 120000,
  taxRateBps: 825,
  pricingVersion: 1,
};
describe("authoritative money arithmetic", () => {
  it("prices extras, insurance, discounts and tax before adding untaxed deposit", () => {
    const p = calculatePrice({
      ...base,
      coupon: { code: "SAVE", kind: "PERCENT", value: 1000 },
    });
    expect(p.baseCents).toBe(20000);
    expect(p.extrasCents).toBe(500);
    expect(p.discountCents).toBe(2750);
    expect(p.taxCents).toBe(2042);
    expect(p.totalCents).toBe(146792);
  });
  it("rounds half-up and caps fixed discounts", () => {
    expect(roundBps(1, 5000)).toBe(1);
    const p = calculatePrice({
      ...base,
      coupon: { code: "ALL", kind: "FIXED", value: 999999 },
    });
    expect(p.totalCents).toBe(base.depositCents);
  });
  it("rejects unsafe money, overflow and invalid quantities", () => {
    expect(() => calculatePrice({ ...base, dailyRateCents: 0.1 })).toThrow();
    expect(() =>
      calculatePrice({ ...base, dailyRateCents: Number.MAX_SAFE_INTEGER }),
    ).toThrow();
    expect(() =>
      calculatePrice({ ...base, extras: [{ ...base.extras[0], quantity: 0 }] }),
    ).toThrow();
  });
});
describe("catalog parsing", () => {
  it("combines filters and parses decimal prices exactly into cents", () => {
    const p = parseCatalog({
      brand: "Audi",
      category: "Sedan",
      min: "12.34",
      max: "200",
      seats: "4",
      transmission: "AUTOMATIC",
      fuel: "Petrol",
      page: "2",
      view: "list",
    });
    expect(p.min).toBe(1234);
    expect(p.page).toBe(2);
    expect(p.seats).toBe(4);
  });
  it("rejects invalid price ranges and incomplete availability", () => {
    expect(() => parseCatalog({ min: "100", max: "10" })).toThrow();
    expect(() => parseCatalog({ pickup: "2027-01-01T10:00" })).toThrow();
    expect(() => parseCatalog({ page: "0" })).toThrow();
  });
});
