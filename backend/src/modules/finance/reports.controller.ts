import type { Request, Response } from "express";
import { AppError } from "../../shared/utils/AppError.js";
import { endOfDayUtc } from "../../shared/utils/dateRange.js";
import * as reportsService from "./reports.service.js";

function parseRange(req: Request) {
  const { dateFrom, dateTo } = req.query;
  if (!dateFrom || !dateTo) {
    throw new AppError(400, "dateFrom and dateTo query parameters are required");
  }
  return { dateFrom: new Date(dateFrom as string), dateTo: endOfDayUtc(dateTo as string) };
}

export async function summary(req: Request, res: Response) {
  const result = await reportsService.getFinancialSummary(parseRange(req));
  res.json({ success: true, data: result });
}

export async function cashFlow(req: Request, res: Response) {
  const result = await reportsService.getCashFlow(parseRange(req));
  res.json({ success: true, data: result });
}
