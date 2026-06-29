import type { Request, Response } from "express";
import { AppError } from "../../shared/utils/AppError.js";
import * as discountService from "./discount.service.js";

export async function create(req: Request, res: Response) {
  const result = await discountService.createDiscount(req.body);
  res.status(201).json({ success: true, data: result });
}

export async function list(_req: Request, res: Response) {
  const discounts = await discountService.listDiscounts();
  res.json({ success: true, data: discounts });
}

export async function update(req: Request, res: Response) {
  const result = await discountService.updateDiscount(req.params.id as string, req.body);
  res.json({ success: true, data: result });
}

export async function preview(req: Request, res: Response) {
  const { code, items } = req.body as {
    code?: string;
    items?: discountService.DiscountEligibleItem[];
  };
  if (!code || !items) {
    throw new AppError(400, "code and items are required");
  }
  const result = await discountService.previewDiscount(code, items);
  res.json({ success: true, data: result });
}
