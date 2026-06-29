import type { Request, Response } from "express";
import * as notificationService from "./notification.service.js";

export async function list(req: Request, res: Response) {
  const notifications = await notificationService.listMyNotifications(req.user!.uid);
  res.json({ success: true, data: notifications });
}

export async function markRead(req: Request, res: Response) {
  const result = await notificationService.markAsRead(req.params.id as string, req.user!.uid);
  res.json({ success: true, data: result });
}

export async function markAllRead(req: Request, res: Response) {
  await notificationService.markAllAsRead(req.user!.uid);
  res.json({ success: true, data: null });
}
