import { z } from "zod";

const addressSchema = z.object({
  label: z.string().optional().default("Delivery address"),
  line1: z.string().min(2),
  line2: z.string().optional(),
  city: z.string().min(1),
});

export const createDeliverySchema = z.object({
  salesOrderId: z.string().min(1),
  pickupAddress: addressSchema,
  dropoffAddress: addressSchema,
  notes: z.string().optional(),
});
export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;

export const assignDriverSchema = z.object({
  driverId: z.string().min(1),
});
export type AssignDriverInput = z.infer<typeof assignDriverSchema>;

export const updateDeliveryStatusSchema = z.object({
  status: z.enum(["picked_up", "in_transit", "delivered", "failed"]),
  note: z.string().optional(),
});
export type UpdateDeliveryStatusInput = z.infer<typeof updateDeliveryStatusSchema>;

export const reportDeliveryIssueSchema = z.object({
  description: z.string().min(5),
});
export type ReportDeliveryIssueInput = z.infer<typeof reportDeliveryIssueSchema>;

export const resolveDeliveryIssueSchema = z.object({
  resolutionNote: z.string().optional(),
});
export type ResolveDeliveryIssueInput = z.infer<typeof resolveDeliveryIssueSchema>;

export const confirmDeliverySchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
});
export type ConfirmDeliveryInput = z.infer<typeof confirmDeliverySchema>;
