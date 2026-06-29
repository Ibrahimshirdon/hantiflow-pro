import type { Request, Response } from "express";
import { uploadBuffer } from "../../shared/utils/uploadFile.js";
import * as stockService from "./stock.service.js";

export async function receive(req: Request, res: Response) {
  const photoUrl = req.file
    ? await uploadBuffer(req.file.buffer, { folder: "goods-receipts", resourceType: "image" })
    : undefined;
  const result = await stockService.receiveStock(req.body, req.user!, photoUrl);
  res.status(201).json({ success: true, data: result });
}

export async function goodsReceipts(req: Request, res: Response) {
  // Staff can only ever see their own receiving history — admin/manager
  // see everyone's, same auto-scoping convention used across the supplier
  // module (caller's own uid wins over any client-supplied filter).
  const receivedBy =
    req.user!.role === "staff" ? req.user!.uid : (req.query.receivedBy as string | undefined);
  const receipts = await stockService.listGoodsReceipts({
    productId: req.query.productId as string | undefined,
    receivedBy,
  });
  res.json({ success: true, data: receipts });
}

export async function batchesForProduct(req: Request, res: Response) {
  const batches = await stockService.listBatchesForProduct(req.params.productId as string);
  res.json({ success: true, data: batches });
}

export async function expiringBatches(req: Request, res: Response) {
  const days = Number(req.query.days ?? 30);
  const batches = await stockService.listExpiringBatches(days);
  res.json({ success: true, data: batches });
}
