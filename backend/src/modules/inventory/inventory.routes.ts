import { Router } from "express";
import { categoryRouter } from "./category.routes.js";
import { productRouter } from "./product.routes.js";
import { stockRouter } from "./stock.routes.js";
import { stockAdjustmentRouter } from "./stockAdjustment.routes.js";

export const inventoryRouter = Router();

inventoryRouter.use("/categories", categoryRouter);
inventoryRouter.use("/products", productRouter);
inventoryRouter.use("/stock", stockRouter);
inventoryRouter.use("/stock-adjustments", stockAdjustmentRouter);
