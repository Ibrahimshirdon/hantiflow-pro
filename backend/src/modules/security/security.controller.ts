import type { Request, Response } from "express";
import * as securityService from "./security.service.js";

export async function auditLogs(req: Request, res: Response) {
  const result = await securityService.listAuditLogs({
    userId: req.query.userId as string | undefined,
    entityType: req.query.entityType as string | undefined,
  });
  res.json({ success: true, data: result });
}

export async function activityLogs(req: Request, res: Response) {
  const result = await securityService.listActivityLogs({
    userId: req.query.userId as string | undefined,
  });
  res.json({ success: true, data: result });
}
