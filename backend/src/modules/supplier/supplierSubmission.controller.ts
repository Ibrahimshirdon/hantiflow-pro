import type { Request, Response } from "express";
import * as supplierSubmissionService from "./supplierSubmission.service.js";

export async function list(req: Request, res: Response) {
  const role = req.user!.role;
  const supplierId = role === "supplier" ? req.user!.uid : undefined;
  const submissions = await supplierSubmissionService.listSubmissions({ supplierId });
  res.json({ success: true, data: submissions });
}

export async function approve(req: Request, res: Response) {
  const result = await supplierSubmissionService.approveSubmission(req.params.id as string, req.user!);
  res.json({ success: true, data: result });
}

export async function reject(req: Request, res: Response) {
  const result = await supplierSubmissionService.rejectSubmission(
    req.params.id as string,
    req.body,
    req.user!,
  );
  res.json({ success: true, data: result });
}
