import { Router } from "express";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { upload } from "../../middleware/upload.js";
import { createExpenseSchema } from "./expense.types.js";
import * as expenseController from "./expense.controller.js";

export const expenseRouter = Router();

expenseRouter.get("/", requireRole(["admin", "manager"]), expenseController.list);
expenseRouter.post(
  "/",
  requireRole(["admin", "manager"]),
  upload.single("receipt"),
  validate(createExpenseSchema),
  expenseController.create,
);
expenseRouter.delete("/:id", requireRole(["admin"]), expenseController.remove);
