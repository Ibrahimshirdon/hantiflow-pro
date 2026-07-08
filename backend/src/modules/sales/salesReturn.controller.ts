import type { Request, Response } from "express";
import { createSalesReturn, listReturnsForOrder } from "./salesReturn.service.js";
import type { AuthenticatedUser } from "../../shared/types/auth.types.js";

export async function processReturn(req: Request, res: Response) {
  const actor = req.user as AuthenticatedUser;
  const result = await createSalesReturn(req.params.id as string, req.body, actor);
  res.status(201).json({ success: true, data: result });
}

export async function listReturns(req: Request, res: Response) {
  const returns = await listReturnsForOrder(req.params.id as string);
  res.json({ success: true, data: returns });
}
