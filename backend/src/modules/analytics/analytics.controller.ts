import type { Request, Response } from "express";
import * as analyticsService from "./analytics.service.js";

function daysBackParam(req: Request, fallback = 30) {
  const raw = req.query.daysBack;
  return raw ? Number(raw) : fallback;
}

export async function salesTrend(req: Request, res: Response) {
  const result = await analyticsService.getSalesTrend(daysBackParam(req));
  res.json({ success: true, data: result });
}

export async function salesForecast(req: Request, res: Response) {
  const daysAhead = req.query.daysAhead ? Number(req.query.daysAhead) : 7;
  const result = await analyticsService.getSalesForecast(daysBackParam(req), daysAhead);
  res.json({ success: true, data: result });
}

export async function topProducts(req: Request, res: Response) {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const result = await analyticsService.getTopProducts(daysBackParam(req), limit);
  res.json({ success: true, data: result });
}

export async function bestCustomers(req: Request, res: Response) {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const result = await analyticsService.getBestCustomers(daysBackParam(req), limit);
  res.json({ success: true, data: result });
}

export async function inventoryInsights(_req: Request, res: Response) {
  const result = await analyticsService.getInventoryInsights();
  res.json({ success: true, data: result });
}
