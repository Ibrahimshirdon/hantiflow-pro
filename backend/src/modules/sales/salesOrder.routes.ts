import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { createSalesOrderSchema } from "./salesOrder.types.js";
import * as salesController from "./salesOrder.controller.js";

export const salesOrderRouter = Router();

salesOrderRouter.use(verifyToken, requireRole(["admin", "manager", "staff"]));
salesOrderRouter.get("/", salesController.list);
salesOrderRouter.post("/", validate(createSalesOrderSchema), salesController.create);
salesOrderRouter.get("/:id", salesController.getById);
salesOrderRouter.get("/:id/invoice", salesController.getInvoice);
salesOrderRouter.get("/:id/receipt", salesController.getReceipt);
