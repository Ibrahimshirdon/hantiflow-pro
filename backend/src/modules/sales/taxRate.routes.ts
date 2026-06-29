import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { createTaxRateSchema, updateTaxRateSchema } from "./taxRate.types.js";
import * as taxRateController from "./taxRate.controller.js";

export const taxRateRouter = Router();

taxRateRouter.use(verifyToken);
taxRateRouter.get("/", taxRateController.list);
taxRateRouter.post(
  "/",
  requireRole(["admin"]),
  validate(createTaxRateSchema),
  taxRateController.create,
);
taxRateRouter.patch(
  "/:id",
  requireRole(["admin"]),
  validate(updateTaxRateSchema),
  taxRateController.update,
);
