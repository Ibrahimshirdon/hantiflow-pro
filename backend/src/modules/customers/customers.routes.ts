import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import {
  adjustLoyaltySchema,
  adjustWalletSchema,
  setCreditLimitSchema,
  updateCustomerStatusSchema,
} from "./customers.types.js";
import * as customersController from "./customers.controller.js";

export const customersRouter = Router();

customersRouter.use(verifyToken, requireRole(["admin", "manager"]));
customersRouter.get("/", customersController.list);
customersRouter.patch(
  "/:uid/status",
  validate(updateCustomerStatusSchema),
  customersController.updateStatus,
);
customersRouter.post(
  "/:uid/wallet-adjust",
  validate(adjustWalletSchema),
  customersController.adjustWallet,
);
customersRouter.post(
  "/:uid/loyalty-adjust",
  validate(adjustLoyaltySchema),
  customersController.adjustLoyalty,
);
customersRouter.patch(
  "/:uid/credit-limit",
  validate(setCreditLimitSchema),
  customersController.setCreditLimit,
);
