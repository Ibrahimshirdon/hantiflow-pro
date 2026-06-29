import { z } from "zod";

export const createSupplierProductSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  category: z.string().min(1),
  brand: z.string().optional(),
  unitType: z.string().min(1),
  quantityInStock: z.coerce.number().nonnegative(),
  wholesalePrice: z.coerce.number().nonnegative(),
  sellingPrice: z.coerce.number().nonnegative(),
  minimumStockLevel: z.coerce.number().nonnegative().default(0),
  taxRateId: z.string().nullable().optional(),
  expiryDate: z.coerce.date().optional(),
  purchasePrice: z.coerce.number().nonnegative(),
  purchaseDate: z.coerce.date().optional(),
  batchNumber: z.string().min(1),
  warehouseLocation: z.string().min(1),
});
export type CreateSupplierProductInput = z.infer<typeof createSupplierProductSchema>;

export const updateSupplierProductSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  category: z.string().min(1).optional(),
  brand: z.string().optional(),
  unitType: z.string().min(1).optional(),
  quantityInStock: z.coerce.number().nonnegative().optional(),
  wholesalePrice: z.coerce.number().nonnegative().optional(),
  sellingPrice: z.coerce.number().nonnegative().optional(),
  minimumStockLevel: z.coerce.number().nonnegative().optional(),
  taxRateId: z.string().nullable().optional(),
  expiryDate: z.coerce.date().optional(),
  purchasePrice: z.coerce.number().nonnegative().optional(),
  batchNumber: z.string().min(1).optional(),
  warehouseLocation: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateSupplierProductInput = z.infer<typeof updateSupplierProductSchema>;

export const submitToInventorySchema = z.object({
  quantity: z.coerce.number().positive(),
});
export type SubmitToInventoryInput = z.infer<typeof submitToInventorySchema>;
