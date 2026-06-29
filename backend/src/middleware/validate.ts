import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../shared/utils/AppError.js";

export function validate(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new AppError(400, result.error.issues[0]?.message ?? "Invalid request body"));
    }
    req.body = result.data;
    next();
  };
}
