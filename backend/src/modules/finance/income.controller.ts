import type { Request, Response } from "express";
import { endOfDayUtc } from "../../shared/utils/dateRange.js";
import * as incomeService from "./income.service.js";

export async function create(req: Request, res: Response) {
  const result = await incomeService.createIncome(req.body, req.user!);
  res.status(201).json({ success: true, data: result });
}

export async function list(req: Request, res: Response) {
  const income = await incomeService.listIncome({
    dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
    dateTo: req.query.dateTo ? endOfDayUtc(req.query.dateTo as string) : undefined,
  });
  res.json({ success: true, data: income });
}
