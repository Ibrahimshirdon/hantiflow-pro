import { apiClient, type ApiSuccess } from "./client";
import type { CustomerSummary } from "@/types/customer.types";

export async function listCustomers() {
  const { data } = await apiClient.get<ApiSuccess<CustomerSummary[]>>("/customers");
  return data.data;
}

export async function setCustomerStatus(uid: string, status: "active" | "suspended") {
  const { data } = await apiClient.patch<ApiSuccess<{ uid: string; status: string }>>(
    `/customers/${uid}/status`,
    { status },
  );
  return data.data;
}

export interface AdjustWalletInput {
  type: "credit" | "debit";
  amount: number;
  reason: string;
}

export async function adjustCustomerWallet(uid: string, input: AdjustWalletInput) {
  const { data } = await apiClient.post<ApiSuccess<{ walletBalance: number }>>(
    `/customers/${uid}/wallet-adjust`,
    input,
  );
  return data.data;
}

export interface AdjustLoyaltyInput {
  pointsChange: number;
  reason: string;
}

export async function adjustCustomerLoyalty(uid: string, input: AdjustLoyaltyInput) {
  const { data } = await apiClient.post<ApiSuccess<{ loyaltyPoints: number }>>(
    `/customers/${uid}/loyalty-adjust`,
    input,
  );
  return data.data;
}

export async function setCustomerCreditLimit(uid: string, creditLimit: number) {
  const { data } = await apiClient.patch<ApiSuccess<{ creditLimit: number }>>(
    `/customers/${uid}/credit-limit`,
    { creditLimit },
  );
  return data.data;
}
