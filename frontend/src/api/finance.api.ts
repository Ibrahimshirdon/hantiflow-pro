import { apiClient, type ApiSuccess } from "./client";
import type { CashFlowPoint, Expense, FinancialSummary, OtherIncome } from "@/types/finance.types";

export interface DateRange {
  dateFrom: string;
  dateTo: string;
}

// Expenses
export interface ExpenseInput {
  category: string;
  amount: number;
  description?: string;
  paidTo?: string;
  paymentMethod: string;
  date: string;
  receipt?: File;
}

export async function createExpense(input: ExpenseInput) {
  const formData = new FormData();
  formData.append("category", input.category);
  formData.append("amount", String(input.amount));
  formData.append("paymentMethod", input.paymentMethod);
  formData.append("date", input.date);
  if (input.description) formData.append("description", input.description);
  if (input.paidTo) formData.append("paidTo", input.paidTo);
  if (input.receipt) formData.append("receipt", input.receipt);

  const { data } = await apiClient.post<ApiSuccess<{ id: string }>>("/finance/expenses", formData);
  return data.data;
}

export async function listExpenses(range?: DateRange) {
  const { data } = await apiClient.get<ApiSuccess<Expense[]>>("/finance/expenses", { params: range });
  return data.data;
}

export async function deleteExpense(id: string) {
  await apiClient.delete(`/finance/expenses/${id}`);
}

// Other income
export interface IncomeInput {
  source: string;
  amount: number;
  date: string;
}

export async function createIncome(input: IncomeInput) {
  const { data } = await apiClient.post<ApiSuccess<{ id: string }>>("/finance/income", input);
  return data.data;
}

export async function listIncome(range?: DateRange) {
  const { data } = await apiClient.get<ApiSuccess<OtherIncome[]>>("/finance/income", { params: range });
  return data.data;
}

// Reports
export async function getFinancialSummary(range: DateRange) {
  const { data } = await apiClient.get<ApiSuccess<FinancialSummary>>("/finance/reports/summary", {
    params: range,
  });
  return data.data;
}

export async function getCashFlow(range: DateRange) {
  const { data } = await apiClient.get<ApiSuccess<CashFlowPoint[]>>("/finance/reports/cash-flow", {
    params: range,
  });
  return data.data;
}
