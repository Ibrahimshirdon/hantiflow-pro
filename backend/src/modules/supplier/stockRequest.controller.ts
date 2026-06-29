import type { Request, Response } from "express";
import * as stockRequestService from "./stockRequest.service.js";

export async function create(req: Request, res: Response) {
  const result = await stockRequestService.createStockRequest(req.body, req.user!);
  res.status(201).json({ success: true, data: result });
}

export async function list(req: Request, res: Response) {
  const supplierId = req.user!.role === "supplier" ? req.user!.uid : undefined;
  const requests = await stockRequestService.listStockRequests({ supplierId });
  res.json({ success: true, data: requests });
}

export async function approve(req: Request, res: Response) {
  const result = await stockRequestService.approveStockRequest(req.params.id as string, req.user!);
  res.json({ success: true, data: result });
}

export async function reject(req: Request, res: Response) {
  const result = await stockRequestService.rejectStockRequest(req.params.id as string, req.body, req.user!);
  res.json({ success: true, data: result });
}
