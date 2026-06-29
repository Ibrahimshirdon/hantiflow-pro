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
  paymentMethod: z.enum(["cash", "card", "wallet", "mobile_money", "loan"]),
});
export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
