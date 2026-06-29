import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { resetSystemSchema } from "./systemReset.types.js";
import * as systemResetController from "./systemReset.controller.js";

export const systemRouter = Router();

systemRouter.post(
  "/reset",
  verifyToken,
  requireRole(["admin"]),
  validate(resetSystemSchema),
  systemResetController.reset,
);
