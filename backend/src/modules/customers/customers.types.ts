import { z } from "zod";

export const updateCustomerStatusSchema = z.object({
  status: z.enum(["active", "suspended"]),
});
export type UpdateCustomerStatusInput = z.infer<typeof updateCustomerStatusSchema>;

export const adjustWalletSchema = z.object({
  type: z.enum(["credit", "debit"]),
  amount: z.coerce.number().positive(),
  reason: z.string().min(2),
});
export type AdjustWalletInput = z.infer<typeof adjustWalletSchema>;

export const adjustLoyaltySchema = z.object({
  pointsChange: z.coerce.number().refine((v) => v !== 0, { message: "Points change cannot be zero" }),
  reason: z.string().min(2),
});
export type AdjustLoyaltyInput = z.infer<typeof adjustLoyaltySchema>;

export const setCreditLimitSchema = z.object({
  creditLimit: z.coerce.number().nonnegative(),
});
export type SetCreditLimitInput = z.infer<typeof setCreditLimitSchema>;
