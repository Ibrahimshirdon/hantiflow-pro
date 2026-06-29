import { apiClient, type ApiSuccess } from "./client";
import type { Discount, Invoice, Receipt, SalesOrder, TaxRate } from "@/types/sales.types";

// Tax rates
export interface TaxRateInput {
  name: string;
  rate: number;
  isDefault?: boolean;
}

export async function listTaxRates() {
  const { data } = await apiClient.get<ApiSuccess<TaxRate[]>>("/sales/tax-rates");
  return data.data;
}

export async function createTaxRate(input: TaxRateInput) {
  const { data } = await apiClient.post<ApiSuccess<{ id: string }>>("/sales/tax-rates", input);
  return data.data;
}

export async function updateTaxRate(id: string, input: Partial<TaxRateInput>) {
  const { data } = await apiClient.patch<ApiSuccess<{ id: string }>>(`/sales/tax-rates/${id}`, input);
  return data.data;
}

// Discounts
export interface DiscountInput {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  appliesTo: "all" | "category" | "product";
  targetIds?: string[];
  minPurchaseAmount?: number;
  validFrom: string;
  validTo: string;
  usageLimit?: number;
}

export async function listDiscounts() {
  const { data } = await apiClient.get<ApiSuccess<Discount[]>>("/sales/discounts");
  return data.data;
}

export async function createDiscount(input: DiscountInput) {
  const { data } = await apiClient.post<ApiSuccess<{ id: string }>>("/sales/discounts", input);
  return data.data;
}

export async function updateDiscount(id: string, input: { isActive?: boolean }) {
  const { data } = await apiClient.patch<ApiSuccess<{ id: string }>>(`/sales/discounts/${id}`, input);
  return data.data;
}

export interface DiscountPreviewItem {
  productId: string;
  categoryId: string;
  lineSubtotal: number;
}

export async function previewDiscount(code: string, items: DiscountPreviewItem[]) {
  const { data } = await apiClient.post<ApiSuccess<{ discountId: string; discountAmount: number }>>(
    "/sales/discounts/preview",
    { code, items },
  );
  return data.data;
}

// Sales orders
export interface CreateSalesOrderInput {
  customerId?: string;
  items: { productId: string; quantity: number }[];
  discountCode?: string;
  paymentMethod: "cash" | "card" | "wallet" | "mobile_money" | "loan";
}

export async function createSalesOrder(input: CreateSalesOrderInput) {
  const { data } = await apiClient.post<ApiSuccess<{ id: string; invoiceId: string; receiptId: string }>>(
    "/sales/orders",
    input,
  );
  return data.data;
}

export async function listSalesOrders(filters?: { status?: string; createdBy?: string }) {
  const { data } = await apiClient.get<ApiSuccess<SalesOrder[]>>("/sales/orders", { params: filters });
  return data.data;
}

export async function getSalesOrder(id: string) {
  const { data } = await apiClient.get<ApiSuccess<SalesOrder>>(`/sales/orders/${id}`);
  return data.data;
}

export async function getInvoiceForOrder(orderId: string) {
  const { data } = await apiClient.get<ApiSuccess<Invoice>>(`/sales/orders/${orderId}/invoice`);
  return data.data;
}

export async function getReceiptForOrder(orderId: string) {
  const { data } = await apiClient.get<ApiSuccess<Receipt>>(`/sales/orders/${orderId}/receipt`);
  return data.data;
}
