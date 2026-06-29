import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { requireRole } from "../../middleware/requireRole.js";
import * as securityController from "./security.controller.js";

export const securityRouter = Router();

securityRouter.use(verifyToken, requireRole(["admin"]));
securityRouter.get("/audit-logs", securityController.auditLogs);
securityRouter.get("/activity-logs", securityController.activityLogs);
