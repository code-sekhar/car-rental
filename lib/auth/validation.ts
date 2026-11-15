import { z } from "zod";
export const emailSchema = z.email().trim().toLowerCase().max(254);
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use at most 128 characters.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.");
export const registrationSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export const emailRequestSchema = z.object({ email: emailSchema }).strict();
export const tokenSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "This link is invalid or has expired.");
export const resetSchema = z
  .object({ token: tokenSchema, password: passwordSchema })
  .strict();
export const verifySchema = z.object({ token: tokenSchema }).strict();
