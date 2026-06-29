import type { Request, Response } from "express";
import * as loanService from "./loan.service.js";

export async function list(req: Request, res: Response) {
  const customerId =
    req.user!.role === "customer" ? req.user!.uid : (req.query.customerId as string | undefined);
  const loans = await loanService.listLoans({
    customerId,
    status: req.query.status as string | undefined,
  });
  res.json({ success: true, data: loans });
}

export async function recordRepayment(req: Request, res: Response) {
  const result = await loanService.recordRepayment(req.params.id as string, req.body, req.user!);
  res.json({ success: true, data: result });
}

export async function repayFromWallet(req: Request, res: Response) {
  const result = await loanService.repayLoanFromWallet(req.params.id as string, req.body, req.user!);
  res.json({ success: true, data: result });
}

export async function listRepayments(req: Request, res: Response) {
  const repayments = await loanService.listRepayments({
    loanId: req.query.loanId as string | undefined,
    customerId: req.query.customerId as string | undefined,
  });
  res.json({ success: true, data: repayments });
}

export async function setDueDate(req: Request, res: Response) {
  const result = await loanService.setLoanDueDate(req.params.id as string, req.body, req.user!);
  res.json({ success: true, data: result });
}
