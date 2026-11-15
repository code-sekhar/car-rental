import { afterEach, describe, expect, it, vi } from "vitest";
import { isPickupInPast, rentalSearchSchema } from "../../lib/search";
import { money } from "../../lib/vehicle";
const valid = {
  location: "Miami",
  pickup: "2030-06-02T10:00",
  return: "2030-06-03T10:00",
};
afterEach(() => vi.useRealTimers());
describe("rental search validation", () => {
  it("accepts a valid date range and an unfiltered location", () => {
    expect(rentalSearchSchema.safeParse(valid).success).toBe(true);
    expect(
      rentalSearchSchema.safeParse({ ...valid, location: "" }).success,
    ).toBe(true);
  });
  it.each(["2030-06-02T10:00", "2030-06-01T10:00"])(
    "rejects return %s at or before pickup",
    (returnAt) => {
      const result = rentalSearchSchema.safeParse({
        ...valid,
        return: returnAt,
      });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues[0].path).toEqual(["return"]);
    },
  );
  it("rejects missing dates and unsupported locations", () => {
    expect(rentalSearchSchema.safeParse({ ...valid, pickup: "" }).success).toBe(
      false,
    );
    expect(
      rentalSearchSchema.safeParse({ ...valid, return: "garbage" }).success,
    ).toBe(false);
    expect(
      rentalSearchSchema.safeParse({ ...valid, location: "unknown" }).success,
    ).toBe(false);
  });
  it.each(["1", "2030-02-30T10:00", "2030-13-01T10:00"])(
    "rejects malformed or impossible calendar dates: %s",
    (pickup) => {
      expect(rentalSearchSchema.safeParse({ ...valid, pickup }).success).toBe(
        false,
      );
    },
  );
  it("checks past pickup times against the clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T12:00:00Z"));
    expect(isPickupInPast("2029-12-31T12:00:00Z")).toBe(true);
    expect(isPickupInPast("2030-01-02T12:00:00Z")).toBe(false);
  });
});
describe("indicative currency display", () => {
  it("formats stored cents without discarding fractional dollars", () => {
    expect(money(9500)).toBe("$95");
    expect(money(9550)).toBe("$95.50");
  });
});
