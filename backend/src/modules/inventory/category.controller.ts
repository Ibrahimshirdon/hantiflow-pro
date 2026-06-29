import type { Request, Response } from "express";
import * as categoryService from "./category.service.js";

export async function create(req: Request, res: Response) {
  const result = await categoryService.createCategory(req.body);
  res.status(201).json({ success: true, data: result });
}

export async function list(_req: Request, res: Response) {
  const categories = await categoryService.listCategories();
  res.json({ success: true, data: categories });
}

export async function update(req: Request, res: Response) {
  const result = await categoryService.updateCategory(req.params.id as string, req.body);
  res.json({ success: true, data: result });
}
