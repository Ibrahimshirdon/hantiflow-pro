import type { Request, Response } from "express";
import { endOfDayUtc } from "../../shared/utils/dateRange.js";
import * as expenseService from "./expense.service.js";

export async function create(req: Request, res: Response) {
  const result = await expenseService.createExpense(req.body, req.user!, req.file?.buffer);
  res.status(201).json({ success: true, data: result });
}

export async function list(req: Request, res: Response) {
  const expenses = await expenseService.listExpenses({
    dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
    dateTo: req.query.dateTo ? endOfDayUtc(req.query.dateTo as string) : undefined,
    category: req.query.category as string | undefined,
  });
  res.json({ success: true, data: expenses });
}

export async function remove(req: Request, res: Response) {
  const result = await expenseService.deleteExpense(req.params.id as string);
  res.json({ success: true, data: result });
}
