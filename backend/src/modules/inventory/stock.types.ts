import { z } from "zod";

export const receiveStockSchema = z.object({
  productId: z.string().min(1),
  batchNumber: z.string().min(1),
  quantity: z.coerce.number().positive(),
  costPrice: z.coerce.number().nonnegative(),
  manufactureDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  damagedQuantity: z.coerce.number().nonnegative().default(0),
  missingQuantity: z.coerce.number().nonnegative().default(0),
  returnedQuantity: z.coerce.number().nonnegative().default(0),
  qualityIssue: z.enum(["damaged", "expired", "wrong_item", "returned_to_supplier"]).optional(),
  notes: z.string().optional(),
});
export type ReceiveStockInput = z.infer<typeof receiveStockSchema>;
