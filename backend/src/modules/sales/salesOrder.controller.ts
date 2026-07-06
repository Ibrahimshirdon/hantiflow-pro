import type { Request, Response } from "express";
import * as salesService from "./salesOrder.service.js";

export async function create(req: Request, res: Response) {
  const result = await salesService.createSalesOrder(req.body, req.user!);
  res.status(201).json({ success: true, data: result });
}

export async function list(req: Request, res: Response) {
  const orders = await salesService.listSalesOrders({
    customerId: req.query.customerId as string | undefined,
    status: req.query.status as string | undefined,
    createdBy: req.query.createdBy as string | undefined,
  });
  res.json({ success: true, data: orders });
}

export async function getById(req: Request, res: Response) {
  const order = await salesService.getSalesOrderById(req.params.id as string);
  res.json({ success: true, data: order });
}

export async function getInvoice(req: Request, res: Response) {
  const invoice = await salesService.getInvoiceForOrder(req.params.id as string);
  res.json({ success: true, data: invoice });
}

export async function getReceipt(req: Request, res: Response) {
  const receipt = await salesService.getReceiptForOrder(req.params.id as string);
  res.json({ success: true, data: receipt });
}

export async function approve(req: Request, res: Response) {
  await salesService.approveOrder(req.params.id as string, req.user!);
  res.json({ success: true });
}

export async function complete(req: Request, res: Response) {
  await salesService.completeOrder(req.params.id as string, req.user!);
  res.json({ success: true });
}

export async function cancel(req: Request, res: Response) {
  await salesService.cancelOrder(req.params.id as string, req.user!);
  res.json({ success: true });
}
