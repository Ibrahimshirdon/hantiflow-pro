import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";
import type { Notification } from "../types/notification.types.js";

interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: Notification["type"];
  relatedEntityId?: string;
}

// Generic enough for any module to call (orders, low-stock alerts, delivery
// status changes, etc.) — not specific to the customer portal.
export async function createNotification(input: CreateNotificationInput) {
  await db.collection("notifications").add({
    userId: input.userId,
    title: input.title,
    message: input.message,
    type: input.type,
    relatedEntityId: input.relatedEntityId ?? null,
    isRead: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}

// Broadcasts the same notification to every user with one of the given
// roles — e.g. notifying every admin/manager about a new request to review,
// or every relevant role about a low-stock alert.
export async function notifyRole(roles: string[], input: Omit<CreateNotificationInput, "userId">) {
  const snap = await db.collection("users").where("role", "in", roles).get();
  await Promise.all(snap.docs.map((doc) => createNotification({ ...input, userId: doc.id })));
}
