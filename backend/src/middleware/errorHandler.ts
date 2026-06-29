import type { NextFunction, Request, Response } from "express";
import { AppError } from "../shared/utils/AppError.js";
import type { ApiError } from "../shared/types/api.types.js";

export function notFoundHandler(req: Request, res: Response) {
  const body: ApiError = { success: false, message: `Route not found: ${req.method} ${req.originalUrl}` };
  res.status(404).json(body);
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof Error ? err.message : "Internal server error";
  const code = err instanceof AppError ? err.code : undefined;

  if (statusCode === 500) {
    console.error(err);
  }

  const body: ApiError = { success: false, message, code };
  res.status(statusCode).json(body);
}
