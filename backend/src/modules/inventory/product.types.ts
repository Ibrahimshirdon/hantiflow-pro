import { z } from "zod";

// Products only ever enter the catalog via a supplier submission (direct or
// via an approved stock request) — see supplierProduct.service.ts's
// submitProductToInventory. There is no admin/manager "create from scratch"
// path, so this file only needs an update schema.
export const updateProductSchema = z.object({
  sku: z.string().min(1).optional(),
  barcode: z.string().optional(),
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  categoryId: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  costPrice: z.coerce.number().nonnegative().optional(),
  sellingPrice: z.coerce.number().nonnegative().optional(),
  taxRateId: z.string().nullable().optional(),
  reorderLevel: z.coerce.number().nonnegative().optional(),
  maxStockLevel: z.coerce.number().nonnegative().optional(),
  trackBatches: z.coerce.boolean().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
