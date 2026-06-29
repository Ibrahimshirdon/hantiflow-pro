import { Router } from "express";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { createSupplierCompanySchema, updateSupplierCompanySchema } from "./supplierCompany.types.js";
import * as supplierCompanyController from "./supplierCompany.controller.js";

export const supplierCompanyRouter = Router();

supplierCompanyRouter.get(
  "/",
  requireRole(["admin", "manager", "supplier"]),
  supplierCompanyController.list,
);
supplierCompanyRouter.get(
  "/:id",
  requireRole(["admin", "manager", "supplier"]),
  supplierCompanyController.getById,
);
supplierCompanyRouter.post(
  "/",
  requireRole(["supplier"]),
  validate(createSupplierCompanySchema),
  supplierCompanyController.create,
);
supplierCompanyRouter.patch(
  "/:id",
  requireRole(["supplier"]),
  validate(updateSupplierCompanySchema),
  supplierCompanyController.update,
);
supplierCompanyRouter.delete("/:id", requireRole(["supplier"]), supplierCompanyController.remove);
