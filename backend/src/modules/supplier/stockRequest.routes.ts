import { Router } from "express";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { createStockRequestSchema, rejectStockRequestSchema } from "./stockRequest.types.js";
import * as stockRequestController from "./stockRequest.controller.js";

export const stockRequestRouter = Router();

stockRequestRouter.get(
  "/",
  requireRole(["admin", "manager", "staff", "supplier"]),
  stockRequestController.list,
);
stockRequestRouter.post(
  "/",
  requireRole(["admin", "manager", "staff"]),
  validate(createStockRequestSchema),
  stockRequestController.create,
);
stockRequestRouter.post("/:id/approve", requireRole(["supplier"]), stockRequestController.approve);
stockRequestRouter.post(
  "/:id/reject",
  requireRole(["supplier"]),
  validate(rejectStockRequestSchema),
  stockRequestController.reject,
);
