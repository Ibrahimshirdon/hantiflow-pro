import type { Request, Response } from "express";
import { AppError } from "../../shared/utils/AppError.js";
import * as productService from "./product.service.js";

export async function list(req: Request, res: Response) {
  const products = await productService.listProducts({
    categoryId: req.query.categoryId as string | undefined,
    lowStockOnly: req.query.lowStock === "true",
    availableForSale: req.query.availableForSale === "true",
  });
  res.json({ success: true, data: products });
}

export async function getById(req: Request, res: Response) {
  const product = await productService.getProductById(req.params.id as string);
  res.json({ success: true, data: product });
}

export async function getByBarcode(req: Request, res: Response) {
  const product = await productService.getProductByBarcode(req.params.barcode as string);
  res.json({ success: true, data: product });
}

export async function update(req: Request, res: Response) {
  const result = await productService.updateProduct(req.params.id as string, req.body);
  res.json({ success: true, data: result });
}

export async function uploadImage(req: Request, res: Response) {
  if (!req.file) {
    throw new AppError(400, "No image file provided");
  }
  const result = await productService.uploadProductImage(req.params.id as string, req.file.buffer);
  res.json({ success: true, data: result });
}

export async function remove(req: Request, res: Response) {
  const result = await productService.deleteProduct(req.params.id as string, req.user!);
  res.json({ success: true, data: result });
}

export async function approve(req: Request, res: Response) {
  const result = await productService.approveProduct(req.params.id as string, req.user!);
  res.json({ success: true, data: result });
}
