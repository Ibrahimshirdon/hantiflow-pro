import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { createSalesOrderSchema } from "./salesOrder.types.js";
import { createReturnSchema } from "./salesReturn.types.js";
import * as salesController from "./salesOrder.controller.js";
import * as returnController from "./salesReturn.controller.js";

export const salesOrderRouter = Router();

salesOrderRouter.use(verifyToken, requireRole(["admin", "manager", "staff"]));
salesOrderRouter.get("/", salesController.list);
salesOrderRouter.post("/", validate(createSalesOrderSchema), salesController.create);
salesOrderRouter.get("/:id", salesController.getById);
salesOrderRouter.get("/:id/invoice", salesController.getInvoice);
salesOrderRouter.get("/:id/receipt", salesController.getReceipt);
salesOrderRouter.patch("/:id/approve", salesController.approve);
salesOrderRouter.patch("/:id/complete", salesController.complete);
salesOrderRouter.patch("/:id/cancel", salesController.cancel);
salesOrderRouter.get("/:id/returns", returnController.listReturns);
salesOrderRouter.post("/:id/returns", validate(createReturnSchema), returnController.processReturn);
