import { z } from "zod";

export const createSupplierCompanySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  location: z.string().min(2),
  managerName: z.string().min(2),
  contactPhone: z.string().min(3),
  contactEmail: z.string().email(),
  registrationDate: z.coerce.date().optional(),
});
export type CreateSupplierCompanyInput = z.infer<typeof createSupplierCompanySchema>;

export const updateSupplierCompanySchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  location: z.string().min(2).optional(),
  managerName: z.string().min(2).optional(),
  contactPhone: z.string().min(3).optional(),
  contactEmail: z.string().email().optional(),
});
export type UpdateSupplierCompanyInput = z.infer<typeof updateSupplierCompanySchema>;
