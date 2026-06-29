import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { requireRole } from "../../middleware/requireRole.js";
import * as analyticsController from "./analytics.controller.js";

export const analyticsRouter = Router();

analyticsRouter.use(verifyToken, requireRole(["admin", "manager", "staff"]));
analyticsRouter.get("/sales-trend", analyticsController.salesTrend);
analyticsRouter.get("/sales-forecast", analyticsController.salesForecast);
analyticsRouter.get("/top-products", analyticsController.topProducts);
analyticsRouter.get("/best-customers", analyticsController.bestCustomers);
analyticsRouter.get("/inventory-insights", analyticsController.inventoryInsights);
