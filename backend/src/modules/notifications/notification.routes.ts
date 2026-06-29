import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import * as notificationController from "./notification.controller.js";

export const notificationRouter = Router();

// No role restriction: every authenticated role (customer, staff, driver,
// etc.) reads/marks only their own notifications, scoped server-side by uid.
notificationRouter.use(verifyToken);
notificationRouter.get("/", notificationController.list);
notificationRouter.patch("/read-all", notificationController.markAllRead);
notificationRouter.patch("/:id/read", notificationController.markRead);
