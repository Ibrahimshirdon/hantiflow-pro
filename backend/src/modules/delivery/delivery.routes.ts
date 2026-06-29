import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { upload } from "../../middleware/upload.js";
import {
  assignDriverSchema,
  confirmDeliverySchema,
  createDeliverySchema,
  reportDeliveryIssueSchema,
  resolveDeliveryIssueSchema,
  updateDeliveryStatusSchema,
} from "./delivery.types.js";
import * as deliveryController from "./delivery.controller.js";

export const deliveryRouter = Router();

deliveryRouter.use(verifyToken);

deliveryRouter.get(
  "/",
  requireRole(["admin", "manager", "staff", "driver"]),
  deliveryController.list,
);
deliveryRouter.post(
  "/",
  requireRole(["admin", "manager", "staff"]),
  validate(createDeliverySchema),
  deliveryController.create,
);
deliveryRouter.get(
  "/by-order/:salesOrderId",
  requireRole(["admin", "manager", "staff", "driver", "customer"]),
  deliveryController.getByOrderId,
);
// Literal "/issues" routes must be registered before "/:id" so Express
// doesn't swallow "issues" as a delivery id.
deliveryRouter.get(
  "/issues",
  requireRole(["admin", "manager"]),
  deliveryController.listIssues,
);
deliveryRouter.patch(
  "/issues/:id/resolve",
  requireRole(["admin", "manager"]),
  validate(resolveDeliveryIssueSchema),
  deliveryController.resolveIssue,
);
deliveryRouter.get(
  "/:id",
  requireRole(["admin", "manager", "staff", "driver", "customer"]),
  deliveryController.getById,
);
deliveryRouter.get(
  "/:id/history",
  requireRole(["admin", "manager", "staff", "driver", "customer"]),
  deliveryController.getHistory,
);
deliveryRouter.get(
  "/:id/issues",
  requireRole(["admin", "manager", "staff", "driver", "customer"]),
  deliveryController.listIssuesForDelivery,
);
deliveryRouter.post(
  "/:id/issues",
  requireRole(["customer"]),
  validate(reportDeliveryIssueSchema),
  deliveryController.reportIssue,
);
deliveryRouter.patch(
  "/:id/assign",
  requireRole(["admin", "manager"]),
  validate(assignDriverSchema),
  deliveryController.assign,
);
deliveryRouter.patch(
  "/:id/status",
  requireRole(["driver"]),
  upload.single("photo"),
  validate(updateDeliveryStatusSchema),
  deliveryController.updateStatus,
);
deliveryRouter.post(
  "/:id/confirm",
  requireRole(["customer"]),
  validate(confirmDeliverySchema),
  deliveryController.confirm,
);
