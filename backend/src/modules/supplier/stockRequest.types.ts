import { z } from "zod";

export const createStockRequestSchema = z.object({
  supplierProductId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  message: z.string().optional(),
});
export type CreateStockRequestInput = z.infer<typeof createStockRequestSchema>;

export const rejectStockRequestSchema = z.object({
  reason: z.string().optional(),
});
export type RejectStockRequestInput = z.infer<typeof rejectStockRequestSchema>;
