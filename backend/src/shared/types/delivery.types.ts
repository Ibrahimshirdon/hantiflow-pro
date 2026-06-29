import type { Timestamp } from "firebase-admin/firestore";
import type { Address } from "./user.types.js";

export interface Delivery {
  id: string;
  salesOrderId: string;
  orderNumber: string;
  customerId: string;
  driverId: string | null;
  status: "unassigned" | "assigned" | "picked_up" | "in_transit" | "delivered" | "failed";
  pickupAddress: Address;
  dropoffAddress: Address;
  proofOfDeliveryUrl: string | null;
  notes: string | null;
  assignedAt: Timestamp | null;
  pickedUpAt: Timestamp | null;
  deliveredAt: Timestamp | null;
  // The customer's own acknowledgment that they actually received the
  // order — distinct from the driver marking the delivery "delivered".
  // Only settable once, only after status is already "delivered".
  customerConfirmedAt: Timestamp | null;
  rating: number | null;
  createdAt: Timestamp;
}

export interface DeliveryStatusEvent {
  id: string;
  status: string;
  note: string | null;
  updatedBy: string;
  createdAt: Timestamp;
}

// A customer-reported problem with a delivery (late, wrong item, damaged,
// rude driver, etc.) — separate from DeliveryStatusEvent, which is the
// driver's own normal status trail, not a complaint.
export interface DeliveryIssue {
  id: string;
  deliveryId: string;
  salesOrderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  description: string;
  status: "open" | "resolved";
  resolutionNote: string | null;
  resolvedBy: string | null;
  resolvedByName: string | null;
  createdAt: Timestamp;
  resolvedAt: Timestamp | null;
}
