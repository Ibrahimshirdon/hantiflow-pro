import { z } from "zod";

export const createExpenseSchema = z.object({
  category: z.string().min(1),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
  paidTo: z.string().optional(),
  paymentMethod: z.string().min(1),
  date: z.coerce.date(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
