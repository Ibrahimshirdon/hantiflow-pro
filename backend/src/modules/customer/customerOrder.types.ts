import { z } from "zod";

const deliveryAddressSchema = z.object({
  label: z.string().optional().default("Delivery address"),
  line1: z.string().min(2),
  line2: z.string().optional(),
  city: z.string().min(1),
});

export const customerCheckoutSchema = z
  .object({
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
    fulfillmentType: z.enum(["pickup", "delivery"]),
    deliveryAddress: deliveryAddressSchema.optional(),
  })
  .refine((data) => data.fulfillmentType !== "delivery" || data.deliveryAddress !== undefined, {
    message: "Delivery address is required for delivery orders",
    path: ["deliveryAddress"],
  });
export type CustomerCheckoutInput = z.infer<typeof customerCheckoutSchema>;
