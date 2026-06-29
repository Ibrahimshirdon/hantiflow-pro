import type { Request, Response } from "express";
import { uploadBuffer } from "../../shared/utils/uploadFile.js";
import * as deliveryService from "./delivery.service.js";

export async function create(req: Request, res: Response) {
  const result = await deliveryService.createDelivery(req.body, req.user!);
  res.status(201).json({ success: true, data: result });
}

export async function list(req: Request, res: Response) {
  const driverId = req.user!.role === "driver" ? req.user!.uid : undefined;
  const deliveries = await deliveryService.listDeliveries({
    status: req.query.status as string | undefined,
    driverId,
  });
  res.json({ success: true, data: deliveries });
}

export async function getById(req: Request, res: Response) {
  const delivery = await deliveryService.getDeliveryById(req.params.id as string, req.user!);
  res.json({ success: true, data: delivery });
}

export async function getByOrderId(req: Request, res: Response) {
  const delivery = await deliveryService.getDeliveryByOrderId(
    req.params.salesOrderId as string,
    req.user!,
  );
  res.json({ success: true, data: delivery });
}

export async function getHistory(req: Request, res: Response) {
  const history = await deliveryService.listStatusHistory(req.params.id as string, req.user!);
  res.json({ success: true, data: history });
}

export async function assign(req: Request, res: Response) {
  const result = await deliveryService.assignDriver(
    req.params.id as string,
    req.body.driverId,
    req.user!,
  );
  res.json({ success: true, data: result });
}

export async function updateStatus(req: Request, res: Response) {
  let proofOfDeliveryUrl: string | undefined;
  if (req.file) {
    proofOfDeliveryUrl = await uploadBuffer(req.file.buffer, {
      folder: "proof-of-delivery",
      resourceType: "image",
    });
  }
  const result = await deliveryService.updateDeliveryStatus(
    req.params.id as string,
    req.body,
    req.user!,
    proofOfDeliveryUrl,
  );
  res.json({ success: true, data: result });
}

export async function reportIssue(req: Request, res: Response) {
  const result = await deliveryService.reportDeliveryIssue(req.params.id as string, req.body, req.user!);
  res.status(201).json({ success: true, data: result });
}

export async function listIssuesForDelivery(req: Request, res: Response) {
  const issues = await deliveryService.listIssuesForDelivery(req.params.id as string, req.user!);
  res.json({ success: true, data: issues });
}

export async function listIssues(req: Request, res: Response) {
  const issues = await deliveryService.listDeliveryIssues({
    status: req.query.status as string | undefined,
  });
  res.json({ success: true, data: issues });
}

export async function resolveIssue(req: Request, res: Response) {
  const result = await deliveryService.resolveDeliveryIssue(req.params.id as string, req.body, req.user!);
  res.json({ success: true, data: result });
}

export async function confirm(req: Request, res: Response) {
  const result = await deliveryService.confirmDelivery(req.params.id as string, req.body, req.user!);
  res.json({ success: true, data: result });
}
