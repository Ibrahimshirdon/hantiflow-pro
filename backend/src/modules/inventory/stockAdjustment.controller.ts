import type { Request, Response } from "express";
import * as stockAdjustmentService from "./stockAdjustment.service.js";

export async function create(req: Request, res: Response) {
  const result = await stockAdjustmentService.createStockAdjustment(req.body, req.user!);
  res.status(201).json({ success: true, data: result });
}

export async function list(req: Request, res: Response) {
  const adjustments = await stockAdjustmentService.listStockAdjustments(
    req.query.productId as string | undefined,
  );
  res.json({ success: true, data: adjustments });
}
