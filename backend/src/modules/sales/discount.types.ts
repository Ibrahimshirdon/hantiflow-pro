import { z } from "zod";

export const createDiscountSchema = z.object({
  code: z
    .string()
    .min(2)
    .transform((v) => v.toUpperCase()),
  type: z.enum(["percentage", "fixed"]),
  value: z.coerce.number().positive(),
  appliesTo: z.enum(["all", "category", "product"]).default("all"),
  targetIds: z.array(z.string()).optional().default([]),
  minPurchaseAmount: z.coerce.number().nonnegative().optional(),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date(),
  usageLimit: z.coerce.number().int().positive().optional(),
});
export type CreateDiscountInput = z.infer<typeof createDiscountSchema>;

export const updateDiscountSchema = z.object({
  isActive: z.boolean().optional(),
  usageLimit: z.coerce.number().int().positive().optional(),
  validTo: z.coerce.date().optional(),
});
export type UpdateDiscountInput = z.infer<typeof updateDiscountSchema>;
