import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { createDiscountSchema, updateDiscountSchema } from "./discount.types.js";
import * as discountController from "./discount.controller.js";

export const discountRouter = Router();

discountRouter.use(verifyToken);
discountRouter.get("/", discountController.list);
discountRouter.post("/preview", discountController.preview);
discountRouter.post(
  "/",
  requireRole(["admin", "manager"]),
  validate(createDiscountSchema),
  discountController.create,
);
discountRouter.patch(
  "/:id",
  requireRole(["admin", "manager"]),
  validate(updateDiscountSchema),
  discountController.update,
);
