import { Router } from "express";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { rejectSubmissionSchema } from "./supplierSubmission.types.js";
import * as supplierSubmissionController from "./supplierSubmission.controller.js";

export const supplierSubmissionRouter = Router();

supplierSubmissionRouter.get(
  "/",
  requireRole(["admin", "manager", "staff", "supplier"]),
  supplierSubmissionController.list,
);
supplierSubmissionRouter.post(
  "/:id/approve",
  requireRole(["admin", "manager"]),
  supplierSubmissionController.approve,
);
supplierSubmissionRouter.post(
  "/:id/reject",
  requireRole(["admin", "manager"]),
  validate(rejectSubmissionSchema),
  supplierSubmissionController.reject,
);
