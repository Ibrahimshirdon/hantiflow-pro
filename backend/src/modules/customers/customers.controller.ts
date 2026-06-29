import type { Request, Response } from "express";
import * as customersService from "./customers.service.js";

export async function list(_req: Request, res: Response) {
  const customers = await customersService.listCustomers();
  res.json({ success: true, data: customers });
}

export async function updateStatus(req: Request, res: Response) {
  const result = await customersService.setCustomerStatus(req.params.uid as string, req.body, req.user!);
  res.json({ success: true, data: result });
}

export async function adjustWallet(req: Request, res: Response) {
  const result = await customersService.adjustCustomerWallet(req.params.uid as string, req.body, req.user!);
  res.json({ success: true, data: result });
}

export async function adjustLoyalty(req: Request, res: Response) {
  const result = await customersService.adjustCustomerLoyaltyPoints(
    req.params.uid as string,
    req.body,
    req.user!,
  );
  res.json({ success: true, data: result });
}

export async function setCreditLimit(req: Request, res: Response) {
  const result = await customersService.setCustomerCreditLimit(
    req.params.uid as string,
    req.body,
    req.user!,
  );
  res.json({ success: true, data: result });
}
