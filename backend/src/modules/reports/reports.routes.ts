import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { requireRole } from "../../middleware/requireRole.js";
import * as reportsController from "./reports.controller.js";

export const reportsRouter = Router();

reportsRouter.use(verifyToken, requireRole(["admin", "manager", "staff"]));
reportsRouter.get("/sales", reportsController.salesReport);
reportsRouter.get("/inventory", reportsController.inventoryReport);
