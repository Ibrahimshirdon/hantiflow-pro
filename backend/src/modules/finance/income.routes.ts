import { Router } from "express";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { createIncomeSchema } from "./income.types.js";
import * as incomeController from "./income.controller.js";

export const incomeRouter = Router();

incomeRouter.use(requireRole(["admin", "manager"]));
incomeRouter.get("/", incomeController.list);
incomeRouter.post("/", validate(createIncomeSchema), incomeController.create);
