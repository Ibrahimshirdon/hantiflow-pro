import type { Request, Response } from "express";
import * as systemResetService from "./systemReset.service.js";

export async function reset(req: Request, res: Response) {
  const result = await systemResetService.resetSystem(req.user!);
  res.json({ success: true, data: result });
}
