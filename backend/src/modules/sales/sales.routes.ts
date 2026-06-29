import { Router } from "express";
import { taxRateRouter } from "./taxRate.routes.js";
import { discountRouter } from "./discount.routes.js";
import { salesOrderRouter } from "./salesOrder.routes.js";

export const salesRouter = Router();

salesRouter.use("/tax-rates", taxRateRouter);
salesRouter.use("/discounts", discountRouter);
salesRouter.use("/orders", salesOrderRouter);
