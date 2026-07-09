import { z } from "zod";

export const createSalesOrderSchema = z.object({
  customerId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().positive(),
      }),
    )
    .min(1),
  discountCode: z.string().optional(),
  paymentMethod: z.enum(["cash", "wallet", "evc_plus", "sahal", "edahab", "loan"]),
  pointsToRedeem: z.coerce.number().int().min(0).optional(),
});
export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
