import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { recordRepaymentSchema, repayFromWalletSchema, setLoanDueDateSchema } from "./loan.types.js";
import * as loanController from "./loan.controller.js";

export const loanRouter = Router();

loanRouter.use(verifyToken);

loanRouter.get("/", requireRole(["admin", "manager", "customer"]), loanController.list);
loanRouter.get("/repayments", requireRole(["admin", "manager"]), loanController.listRepayments);
loanRouter.post(
  "/:id/repay",
  requireRole(["admin", "manager"]),
  validate(recordRepaymentSchema),
  loanController.recordRepayment,
);
loanRouter.post(
  "/:id/repay-from-wallet",
  requireRole(["customer"]),
  validate(repayFromWalletSchema),
  loanController.repayFromWallet,
);
loanRouter.patch(
  "/:id/due-date",
  requireRole(["admin"]),
  validate(setLoanDueDateSchema),
  loanController.setDueDate,
);
