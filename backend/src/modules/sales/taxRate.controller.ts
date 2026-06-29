import type { Request, Response } from "express";
import * as taxRateService from "./taxRate.service.js";

export async function create(req: Request, res: Response) {
  const result = await taxRateService.createTaxRate(req.body);
  res.status(201).json({ success: true, data: result });
}

export async function list(_req: Request, res: Response) {
  const taxRates = await taxRateService.listTaxRates();
  res.json({ success: true, data: taxRates });
}

export async function update(req: Request, res: Response) {
  const result = await taxRateService.updateTaxRate(req.params.id as string, req.body);
  res.json({ success: true, data: result });
}