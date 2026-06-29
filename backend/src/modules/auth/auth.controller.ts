import type { Request, Response } from "express";
import { AppError } from "../../shared/utils/AppError.js";
import type { UserRole } from "../../shared/types/auth.types.js";
import * as authService from "./auth.service.js";

export async function register(req: Request, res: Response) {
  const result = await authService.registerCustomer(req.body);
  res.status(201).json({ success: true, data: result });
}

export async function me(req: Request, res: Response) {
  const profile = await authService.getMe(req.user!.uid);
  res.json({ success: true, data: profile });
}

export async function createUser(req: Request, res: Response) {
  const result = await authService.createUserByAdmin(req.body, req.user!);
  res.status(201).json({ success: true, data: result });
}

export async function getUsers(req: Request, res: Response) {
  const role = req.query.role as UserRole | undefined;
  const users = await authService.listUsers({ role });
  res.json({ success: true, data: users });
}

export async function getUserById(req: Request, res: Response) {
  const profile = await authService.getMe(req.params.uid as string);
  res.json({ success: true, data: profile });
}

export async function updateUserStatus(req: Request, res: Response) {
  await authService.setUserStatus(req.params.uid as string, req.body.status, req.user!);
  res.json({ success: true, data: { uid: req.params.uid, status: req.body.status } });
}

export async function updateMe(req: Request, res: Response) {
  const result = await authService.updateMyProfile(req.user!.uid, req.body);
  res.json({ success: true, data: result });
}

export async function uploadMyPhoto(req: Request, res: Response) {
  if (!req.file) {
    throw new AppError(400, "No image file provided");
  }
  const result = await authService.uploadMyPhoto(req.user!.uid, req.file.buffer);
  res.json({ success: true, data: result });
}

export async function deleteUser(req: Request, res: Response) {
  const result = await authService.deleteUser(req.params.uid as string, req.user!);
  res.json({ success: true, data: result });
}

export async function resetUserPassword(req: Request, res: Response) {
  const result = await authService.resetUserPassword(req.params.uid as string, req.body, req.user!);
  res.json({ success: true, data: result });
}

export async function resolveLogin(req: Request, res: Response) {
  const identifier = req.query.identifier as string | undefined;
  if (!identifier) {
    throw new AppError(400, "Missing identifier");
  }
  const result = await authService.resolveLoginIdentifier(identifier);
  res.json({ success: true, data: result });
}
