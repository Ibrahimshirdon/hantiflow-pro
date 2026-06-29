import type { Request, Response } from "express";
import * as salaryService from "./salary.service.js";

export async function set(req: Request, res: Response) {
  const result = await salaryService.setSalary(req.body, req.user!);
  res.status(201).json({ success: true, data: result });
}

export async function list(_req: Request, res: Response) {
  const salaries = await salaryService.listSalaries();
  res.json({ success: true, data: salaries });
}

export async function remove(req: Request, res: Response) {
  const result = await salaryService.deleteSalary(req.params.staffId as string);
  res.json({ success: true, data: result });
}
