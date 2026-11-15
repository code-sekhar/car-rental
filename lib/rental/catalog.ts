import { z } from "zod";
const text = z.string().trim().max(100).default("");
const amount = z
  .string()
  .regex(/^\d{1,6}(\.\d{1,2})?$/)
  .transform((v) => Math.round(Number(v) * 100));
export const catalogSchema = z
  .object({
    q: text,
    brand: text,
    category: text,
    location: text,
    fuel: text,
    transmission: z.enum(["", "AUTOMATIC", "MANUAL"]).default(""),
    seats: z.coerce.number().int().min(1).max(12).optional(),
    min: amount.optional(),
    max: amount.optional(),
    sort: z.enum(["", "price-asc", "price-desc", "newest"]).default(""),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce
      .number()
      .pipe(z.union([z.literal(9), z.literal(12), z.literal(24)]))
      .default(9),
    view: z.enum(["grid", "list", "map"]).default("grid"),
    pickup: text,
    return: text,
  })
  .superRefine((v, c) => {
    if (v.min !== undefined && v.max !== undefined && v.min > v.max)
      c.addIssue({
        code: "custom",
        path: ["min"],
        message: "Minimum price must not exceed maximum price.",
      });
    if (Boolean(v.pickup) !== Boolean(v.return))
      c.addIssue({
        code: "custom",
        path: ["pickup"],
        message: "Choose both pickup and return times.",
      });
    if (v.pickup && !v.location)
      c.addIssue({
        code: "custom",
        path: ["location"],
        message: "Choose a location for date availability.",
      });
  });
export type CatalogFilters = z.infer<typeof catalogSchema>;
export function parseCatalog(
  raw: Record<string, string | string[] | undefined>,
) {
  return catalogSchema.parse(
    Object.fromEntries(
      Object.entries(raw).filter(([, v]) => typeof v === "string" && v !== ""),
    ),
  );
}
