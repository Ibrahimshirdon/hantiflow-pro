import { db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import type { Notification } from "../../shared/types/notification.types.js";

const collection = () => db.collection("notifications");

export async function listMyNotifications(userId: string) {
  const snap = await collection().where("userId", "==", userId).get();
  const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification);
  return notifications.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export async function markAsRead(id: string, userId: string) {
  const ref = collection().doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(404, "Notification not found");
  }
  if ((snap.data() as Notification).userId !== userId) {
    throw new AppError(403, "This notification does not belong to you");
  }
  await ref.update({ isRead: true });
  return { id };
}

export async function markAllAsRead(userId: string) {
  const snap = await collection().where("userId", "==", userId).where("isRead", "==", false).get();
  await Promise.all(snap.docs.map((d) => d.ref.update({ isRead: true })));
}
