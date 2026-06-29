import { apiClient, type ApiSuccess } from "./client";
import type { Wallet } from "@/types/customer.types";
import type { SalesOrder, Invoice, Receipt } from "@/types/sales.types";
import type { Address } from "@/types/delivery.types";

// Checkout & orders
export interface CustomerCheckoutInput {
  items: { productId: string; quantity: number }[];
  discountCode?: string;
  paymentMethod: "cash" | "card" | "wallet" | "mobile_money" | "loan";
  fulfillmentType: "pickup" | "delivery";
  deliveryAddress?: Address;
}

export async function getDeliveryFee() {
  const { data } = await apiClient.get<ApiSuccess<{ deliveryFee: number }>>("/customer/delivery-fee");
  return data.data.deliveryFee;
}

export async function customerCheckout(input: CustomerCheckoutInput) {
  const { data } = await apiClient.post<ApiSuccess<{ id: string; invoiceId: string; receiptId: string }>>(
    "/customer/checkout",
    input,
  );
  return data.data;
}

export async function listMyOrders() {
  const { data } = await apiClient.get<ApiSuccess<SalesOrder[]>>("/customer/orders");
  return data.data;
}

export async function getMyOrder(id: string) {
  const { data } = await apiClient.get<ApiSuccess<SalesOrder>>(`/customer/orders/${id}`);
  return data.data;
}

export async function getMyInvoice(orderId: string) {
  const { data } = await apiClient.get<ApiSuccess<Invoice>>(`/customer/orders/${orderId}/invoice`);
  return data.data;
}

export async function getMyReceipt(orderId: string) {
  const { data } = await apiClient.get<ApiSuccess<Receipt>>(`/customer/orders/${orderId}/receipt`);
  return data.data;
}

// Wallet
export async function getMyWallet() {
  const { data } = await apiClient.get<ApiSuccess<Wallet>>("/customer/wallet");
  return data.data;
}
