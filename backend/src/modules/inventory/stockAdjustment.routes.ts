import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { createStockAdjustmentSchema } from "./stockAdjustment.types.js";
import * as stockAdjustmentController from "./stockAdjustment.controller.js";

export const stockAdjustmentRouter = Router();

stockAdjustmentRouter.use(verifyToken, requireRole(["admin", "manager", "staff"]));
stockAdjustmentRouter.get("/", stockAdjustmentController.list);
stockAdjustmentRouter.post(
  "/",
  requireRole(["admin", "manager"]),
  validate(createStockAdjustmentSchema),
  stockAdjustmentController.create,
);
