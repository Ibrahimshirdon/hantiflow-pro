import type { Request, Response } from "express";
import * as supplierCompanyService from "./supplierCompany.service.js";

export async function create(req: Request, res: Response) {
  const result = await supplierCompanyService.createSupplierCompany(req.body, req.user!);
  res.status(201).json({ success: true, data: result });
}

export async function list(req: Request, res: Response) {
  const role = req.user!.role;
  const supplierId = role === "supplier" ? req.user!.uid : (req.query.supplierId as string | undefined);
  const companies = await supplierCompanyService.listSupplierCompanies({ supplierId });
  res.json({ success: true, data: companies });
}

export async function getById(req: Request, res: Response) {
  const company = await supplierCompanyService.getSupplierCompanyById(req.params.id as string);
  res.json({ success: true, data: company });
}

export async function update(req: Request, res: Response) {
  const result = await supplierCompanyService.updateSupplierCompany(
    req.params.id as string,
    req.body,
    req.user!,
  );
  res.json({ success: true, data: result });
}

export async function remove(req: Request, res: Response) {
  const result = await supplierCompanyService.deleteSupplierCompany(req.params.id as string, req.user!);
  res.json({ success: true, data: result });
}
