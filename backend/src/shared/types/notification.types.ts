import type { Timestamp } from "firebase-admin/firestore";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "order" | "delivery" | "stock" | "system" | "wallet";
  isRead: boolean;
  relatedEntityId: string | null;
  createdAt: Timestamp;
}
