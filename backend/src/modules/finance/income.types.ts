import { z } from "zod";

export const createIncomeSchema = z.object({
  source: z.string().min(1),
  amount: z.coerce.number().positive(),
  date: z.coerce.date(),
});
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
