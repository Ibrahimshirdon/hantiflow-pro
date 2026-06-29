import { z } from "zod";

export const createTaxRateSchema = z.object({
  name: z.string().min(1),
  rate: z.coerce.number().min(0).max(1),
  isDefault: z.boolean().optional().default(false),
});
export type CreateTaxRateInput = z.infer<typeof createTaxRateSchema>;

// Not derived via createTaxRateSchema.partial(): isDefault uses .default(false)
// in the create schema, which Zod would still apply for an omitted field even
// under .partial(), silently resetting isDefault to false on every partial
// update that doesn't explicitly include it (e.g. a name-only rename).
export const updateTaxRateSchema = z.object({
  name: z.string().min(1).optional(),
  rate: z.coerce.number().min(0).max(1).optional(),
  isDefault: z.boolean().optional(),
});
export type UpdateTaxRateInput = z.infer<typeof updateTaxRateSchema>;
