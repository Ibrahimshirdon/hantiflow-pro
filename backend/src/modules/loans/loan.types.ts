import { z } from "zod";

export const recordRepaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.enum(["cash", "card", "mobile_money", "wallet"]),
});
export type RecordRepaymentInput = z.infer<typeof recordRepaymentSchema>;

export const repayFromWalletSchema = z.object({
  amount: z.coerce.number().positive(),
});
export type RepayFromWalletInput = z.infer<typeof repayFromWalletSchema>;

export const setLoanDueDateSchema = z.object({
  dueDate: z.coerce.date(),
});
export type SetLoanDueDateInput = z.infer<typeof setLoanDueDateSchema>;
