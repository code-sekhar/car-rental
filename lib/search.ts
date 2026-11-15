import { z } from "zod";
const dateTime = z.iso.datetime({
  local: true,
  precision: -1,
  error: "Choose a valid date and time.",
});
export const rentalSearchSchema = z
  .object({
    location: z.string().trim().max(100),
    pickup: dateTime,
    return: dateTime,
  })
  .superRefine((data, ctx) => {
    if (Date.parse(data.return) <= Date.parse(data.pickup))
      ctx.addIssue({
        code: "custom",
        path: ["return"],
        message: "Return must be after pickup.",
      });
  });
export type RentalSearch = z.infer<typeof rentalSearchSchema>;

/** Evaluated at submission/request time, never for cached inventory or pricing. */
export function isPickupInPast(value: string): boolean {
  return Date.parse(value) < Date.now();
}
