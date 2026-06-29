import { apiClient, type ApiSuccess } from "./client";
import type { Notification } from "@/types/customer.types";

// Generic to any authenticated role - not customer-specific.
export async function listMyNotifications() {
  const { data } = await apiClient.get<ApiSuccess<Notification[]>>("/notifications");
  return data.data;
}

export async function markNotificationRead(id: string) {
  await apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  await apiClient.patch("/notifications/read-all");
}
