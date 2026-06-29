import { apiClient, type ApiSuccess } from "./client";
import type { Address, Delivery, DeliveryIssue, DeliveryStatusEvent } from "@/types/delivery.types";

export interface CreateDeliveryInput {
  salesOrderId: string;
  pickupAddress: Address;
  dropoffAddress: Address;
  notes?: string;
}

export async function createDelivery(input: CreateDeliveryInput) {
  const { data } = await apiClient.post<ApiSuccess<{ id: string }>>("/delivery", input);
  return data.data;
}

export async function listDeliveries(status?: string) {
  const { data } = await apiClient.get<ApiSuccess<Delivery[]>>("/delivery", {
    params: status ? { status } : undefined,
  });
  return data.data;
}

export async function getDelivery(id: string) {
  const { data } = await apiClient.get<ApiSuccess<Delivery>>(`/delivery/${id}`);
  return data.data;
}

export async function getDeliveryByOrder(salesOrderId: string) {
  const { data } = await apiClient.get<ApiSuccess<Delivery>>(`/delivery/by-order/${salesOrderId}`);
  return data.data;
}

export async function getDeliveryHistory(id: string) {
  const { data } = await apiClient.get<ApiSuccess<DeliveryStatusEvent[]>>(`/delivery/${id}/history`);
  return data.data;
}

export async function assignDriver(id: string, driverId: string) {
  const { data } = await apiClient.patch<ApiSuccess<{ id: string }>>(`/delivery/${id}/assign`, {
    driverId,
  });
  return data.data;
}

export async function updateDeliveryStatus(
  id: string,
  status: "picked_up" | "in_transit" | "delivered" | "failed",
  note?: string,
  photo?: File,
) {
  const formData = new FormData();
  formData.append("status", status);
  if (note) formData.append("note", note);
  if (photo) formData.append("photo", photo);
  const { data } = await apiClient.patch<ApiSuccess<{ id: string; status: string }>>(
    `/delivery/${id}/status`,
    formData,
  );
  return data.data;
}

export async function reportDeliveryIssue(deliveryId: string, description: string) {
  const { data } = await apiClient.post<ApiSuccess<{ id: string }>>(`/delivery/${deliveryId}/issues`, {
    description,
  });
  return data.data;
}

export async function listIssuesForDelivery(deliveryId: string) {
  const { data } = await apiClient.get<ApiSuccess<DeliveryIssue[]>>(`/delivery/${deliveryId}/issues`);
  return data.data;
}

export async function listDeliveryIssues(status?: string) {
  const { data } = await apiClient.get<ApiSuccess<DeliveryIssue[]>>("/delivery/issues", {
    params: status ? { status } : undefined,
  });
  return data.data;
}

export async function resolveDeliveryIssue(id: string, resolutionNote?: string) {
  const { data } = await apiClient.patch<ApiSuccess<{ id: string }>>(`/delivery/issues/${id}/resolve`, {
    resolutionNote,
  });
  return data.data;
}

export async function confirmDelivery(id: string, rating: number) {
  const { data } = await apiClient.post<ApiSuccess<{ id: string }>>(`/delivery/${id}/confirm`, {
    rating,
  });
  return data.data;
}
