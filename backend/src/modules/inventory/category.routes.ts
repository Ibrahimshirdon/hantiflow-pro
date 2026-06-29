import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { createCategorySchema, updateCategorySchema } from "./category.types.js";
import * as categoryController from "./category.controller.js";

export const categoryRouter = Router();

categoryRouter.use(verifyToken);
categoryRouter.get("/", categoryController.list);
categoryRouter.post(
  "/",
  requireRole(["admin", "manager"]),
  validate(createCategorySchema),
  categoryController.create,
);
categoryRouter.patch(
  "/:id",
  requireRole(["admin", "manager"]),
  validate(updateCategorySchema),
  categoryController.update,
);
