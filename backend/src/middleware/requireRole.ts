import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../shared/types/auth.types.js";
import { AppError } from "../shared/utils/AppError.js";

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, "Not authenticated"));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(403, "Insufficient permissions for this action"));
    }
    next();
  };
}
