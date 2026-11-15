import { z } from "zod";
const id = z.string().min(1).max(100);
const localDate = z.iso
  .datetime({ local: true, precision: -1 })
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a local date and time.");
export const periodFields = {
  pickupLocationId: id,
  returnLocationId: id,
  pickupLocal: localDate,
  returnLocal: localDate,
  delivery: z.boolean(),
};
export const periodSchema = z.object(periodFields).strict();
export const draftSchema = periodSchema
  .extend({
    vehicleSlug: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(120),
    idempotencyKey: z.uuid(),
  })
  .strict();
export const selectedExtraSchema = z
  .object({ serviceId: id, quantity: z.number().int().min(1).max(4) })
  .strict();
export const extrasSchema = z
  .array(selectedExtraSchema)
  .max(12)
  .refine(
    (items) => new Set(items.map((i) => i.serviceId)).size === items.length,
    "Select each service only once.",
  );
export const driverSchema = z
  .object({
    firstName: z.string().trim().min(2).max(60),
    lastName: z.string().trim().min(2).max(60),
    age: z.number().int().min(21, "The minimum driver age is 21.").max(100),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{8,24}$/, "Enter a valid phone number."),
    chauffeur: z.boolean(),
    license: z.string().trim().max(64).optional(),
    ageConfirmed: z.literal(true, { error: "Confirm the driver’s age." }),
  })
  .superRefine((v, ctx) => {
    if (!v.chauffeur && (!v.license || v.license.length < 5))
      ctx.addIssue({
        code: "custom",
        path: ["license"],
        message: "Enter a valid driving license number.",
      });
  });
const version = z.number().int().min(0);
export const updateDraftSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("period"), version, ...periodFields }).strict(),
  z
    .object({ kind: z.literal("extras"), version, extras: extrasSchema })
    .strict(),
  z
    .object({
      kind: z.literal("driver"),
      version,
      driver: driverSchema,
      insurancePlanId: id.nullable(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("coupon"),
      version,
      code: z
        .string()
        .trim()
        .toUpperCase()
        .max(40)
        .regex(/^[A-Z0-9_-]*$/),
    })
    .strict(),
]);
export const quoteSelectionSchema = z
  .object({
    extras: extrasSchema.optional(),
    insurancePlanId: id.nullable().optional(),
  })
  .strict();
export const holdSchema = z
  .object({ version, quoteHash: z.string().regex(/^[a-f0-9]{64}$/) })
  .strict();
export const cancelSchema = z
  .object({ reason: z.string().trim().min(5).max(500) })
  .strict();
export type PeriodInput = z.infer<typeof periodSchema>;
export type DriverInput = z.infer<typeof driverSchema>;
export type ExtraSelection = z.infer<typeof selectedExtraSchema>;
