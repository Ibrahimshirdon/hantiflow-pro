import { z } from "zod";

export const createReturnSchema = z.object({
  reason: z.string().min(3, "Reason must be at least 3 characters"),
  items: z
    .array(
      z.object({
        productId: z.string(),
        batchId: z.string().nullable(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1, "Select at least one item to return"),
});

export type CreateReturnInput = z.infer<typeof createReturnSchema>;
