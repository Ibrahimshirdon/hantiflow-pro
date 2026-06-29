import { apiClient, type ApiSuccess } from "./client";
import type { Loan, LoanRepayment } from "@/types/loan.types";

export async function listLoans(filters?: { customerId?: string; status?: string }) {
  const { data } = await apiClient.get<ApiSuccess<Loan[]>>("/loans", { params: filters });
  return data.data;
}

export async function listRepayments(filters?: { loanId?: string; customerId?: string }) {
  const { data } = await apiClient.get<ApiSuccess<LoanRepayment[]>>("/loans/repayments", {
    params: filters,
  });
  return data.data;
}

export async function recordRepayment(
  loanId: string,
  amount: number,
  method: "cash" | "card" | "mobile_money" | "wallet",
) {
  const { data } = await apiClient.post<ApiSuccess<{ id: string; balanceRemaining: number; status: string }>>(
    `/loans/${loanId}/repay`,
    { amount, method },
  );
  return data.data;
}

export async function repayLoanFromWallet(loanId: string, amount: number) {
  const { data } = await apiClient.post<
    ApiSuccess<{ id: string; balanceRemaining: number; status: string; walletBalance: number }>
  >(`/loans/${loanId}/repay-from-wallet`, { amount });
  return data.data;
}

export async function setLoanDueDate(loanId: string, dueDate: string) {
  const { data } = await apiClient.patch<ApiSuccess<{ id: string; dueDate: string }>>(
    `/loans/${loanId}/due-date`,
    { dueDate },
  );
  return data.data;
}
