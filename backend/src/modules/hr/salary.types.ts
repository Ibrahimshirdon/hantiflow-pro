import { z } from "zod";

export const setSalarySchema = z.object({
  staffId: z.string().min(1),
  monthlySalary: z.coerce.number().nonnegative(),
  effectiveDate: z.coerce.date(),
  notes: z.string().optional(),
});
export type SetSalaryInput = z.infer<typeof setSalarySchema>;
