import type { Request, Response } from "express";
import * as customerOrderService from "./customerOrder.service.js";

export async function getDeliveryFee(_req: Request, res: Response) {
  res.json({ success: true, data: { deliveryFee: customerOrderService.getDeliveryFee() } });
}

export async function checkout(req: Request, res: Response) {
  const result = await customerOrderService.customerCheckout(req.user!.uid, req.body, req.user!);
  res.status(201).json({ success: true, data: result });
}

export async function list(req: Request, res: Response) {
  const orders = await customerOrderService.listMyOrders(req.user!.uid);
  res.json({ success: true, data: orders });
}

export async function getById(req: Request, res: Response) {
  const order = await customerOrderService.getMyOrder(req.params.id as string, req.user!.uid);
  res.json({ success: true, data: order });
}

export async function getInvoice(req: Request, res: Response) {
  const invoice = await customerOrderService.getMyInvoice(req.params.id as string, req.user!.uid);
  res.json({ success: true, data: invoice });
}

export async function getReceipt(req: Request, res: Response) {
  const receipt = await customerOrderService.getMyReceipt(req.params.id as string, req.user!.uid);
  res.json({ success: true, data: receipt });
}
