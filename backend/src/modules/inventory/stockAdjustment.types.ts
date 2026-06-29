import { z } from "zod";

export const createStockAdjustmentSchema = z.object({
  productId: z.string().min(1),
  batchId: z.string().min(1),
  type: z.enum(["damage", "correction", "loss", "recount"]),
  quantityChange: z.coerce.number().refine((v) => v !== 0, { message: "Quantity change cannot be zero" }),
  reason: z.string().min(2),
});
export type CreateStockAdjustmentInput = z.infer<typeof createStockAdjustmentSchema>;
