import type { Request, Response } from "express";
import type { AuthenticatedUser } from "../../shared/types/auth.types.js";
import {
  commitStocktakeSession,
  createStocktakeSession,
  getStocktakeSession,
  listStocktakeSessions,
} from "./stocktakeSession.service.js";

export async function createSession(req: Request, res: Response) {
  const actor = req.user as AuthenticatedUser;
  const result = await createStocktakeSession(req.body, actor);
  res.status(201).json({ success: true, data: result });
}

export async function listSessions(_req: Request, res: Response) {
  const sessions = await listStocktakeSessions();
  res.json({ success: true, data: sessions });
}

export async function getSession(req: Request, res: Response) {
  const session = await getStocktakeSession(req.params.id as string);
  res.json({ success: true, data: session });
}

export async function commitSession(req: Request, res: Response) {
  const actor = req.user as AuthenticatedUser;
  const result = await commitStocktakeSession(req.params.id as string, req.body, actor);
  res.json({ success: true, data: result });
}
