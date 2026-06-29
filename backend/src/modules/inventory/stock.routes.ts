import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { upload } from "../../middleware/upload.js";
import { receiveStockSchema } from "./stock.types.js";
import * as stockController from "./stock.controller.js";

export const stockRouter = Router();

stockRouter.use(verifyToken);
stockRouter.post(
  "/receive",
  requireRole(["admin", "manager", "staff"]),
  upload.single("photo"),
  validate(receiveStockSchema),
  stockController.receive,
);
stockRouter.get("/batches/expiring", stockController.expiringBatches);
stockRouter.get("/batches/:productId", stockController.batchesForProduct);
stockRouter.get(
  "/goods-receipts",
  requireRole(["admin", "manager", "staff"]),
  stockController.goodsReceipts,
);
