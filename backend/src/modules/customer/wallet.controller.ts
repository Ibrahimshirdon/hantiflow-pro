import type { Request, Response } from "express";
import * as walletService from "./wallet.service.js";

export async function getMyWallet(req: Request, res: Response) {
  const wallet = await walletService.getWallet(req.user!.uid);
  res.json({ success: true, data: wallet });
}
