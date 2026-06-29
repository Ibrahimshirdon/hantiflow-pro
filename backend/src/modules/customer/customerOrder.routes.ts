import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { customerCheckoutSchema } from "./customerOrder.types.js";
import * as customerOrderController from "./customerOrder.controller.js";

export const customerOrderRouter = Router();

customerOrderRouter.get("/delivery-fee", customerOrderController.getDeliveryFee);
customerOrderRouter.post(
  "/checkout",
  validate(customerCheckoutSchema),
  customerOrderController.checkout,
);
customerOrderRouter.get("/orders", customerOrderController.list);
customerOrderRouter.get("/orders/:id", customerOrderController.getById);
customerOrderRouter.get("/orders/:id/invoice", customerOrderController.getInvoice);
customerOrderRouter.get("/orders/:id/receipt", customerOrderController.getReceipt);
