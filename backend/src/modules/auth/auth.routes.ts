import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { upload } from "../../middleware/upload.js";
import {
  createUserByAdminSchema,
  registerCustomerSchema,
  resetUserPasswordSchema,
  setUserStatusSchema,
  updateMyProfileSchema,
  updateUserByAdminSchema,
} from "./auth.types.js";
import * as authController from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", validate(registerCustomerSchema), authController.register);
authRouter.get("/resolve-login", authController.resolveLogin);
authRouter.get("/me", verifyToken, authController.me);
authRouter.post(
  "/users",
  verifyToken,
  requireRole(["admin"]),
  validate(createUserByAdminSchema),
  authController.createUser,
);
authRouter.get(
  "/users",
  verifyToken,
  requireRole(["admin", "manager", "staff"]),
  authController.getUsers,
);
authRouter.get(
  "/users/:uid",
  verifyToken,
  requireRole(["admin"]),
  authController.getUserById,
);
authRouter.patch(
  "/users/:uid",
  verifyToken,
  requireRole(["admin"]),
  validate(updateUserByAdminSchema),
  authController.updateUserByAdmin,
);
authRouter.patch(
  "/users/:uid/status",
  verifyToken,
  requireRole(["admin"]),
  validate(setUserStatusSchema),
  authController.updateUserStatus,
);
authRouter.delete(
  "/users/:uid",
  verifyToken,
  requireRole(["admin"]),
  authController.deleteUser,
);
authRouter.post(
  "/users/:uid/reset-password",
  verifyToken,
  requireRole(["admin"]),
  validate(resetUserPasswordSchema),
  authController.resetUserPassword,
);
authRouter.patch(
  "/me",
  verifyToken,
  validate(updateMyProfileSchema),
  authController.updateMe,
);
authRouter.post(
  "/me/photo",
  verifyToken,
  upload.single("photo"),
  authController.uploadMyPhoto,
);
