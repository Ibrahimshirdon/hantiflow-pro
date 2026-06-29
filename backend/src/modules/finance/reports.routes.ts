import { Router } from "express";
import { requireRole } from "../../middleware/requireRole.js";
import * as reportsController from "./reports.controller.js";

export const reportsRouter = Router();

reportsRouter.use(requireRole(["admin", "manager"]));
reportsRouter.get("/summary", reportsController.summary);
reportsRouter.get("/cash-flow", reportsController.cashFlow);
