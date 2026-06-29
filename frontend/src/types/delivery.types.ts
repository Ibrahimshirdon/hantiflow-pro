interface FirestoreTimestampLike {
  _seconds: number;
  _nanoseconds: number;
}

export interface Address {
  label: string;
  line1: string;
  line2?: string;
  city: string;
}

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
  assignedAt: FirestoreTimestampLike | null;
  pickedUpAt: FirestoreTimestampLike | null;
  deliveredAt: FirestoreTimestampLike | null;
  customerConfirmedAt: FirestoreTimestampLike | null;
  rating: number | null;
  createdAt: FirestoreTimestampLike;
}

export interface DeliveryStatusEvent {
  id: string;
  status: string;
  note: string | null;
  updatedBy: string;
  createdAt: FirestoreTimestampLike;
}

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
  createdAt: FirestoreTimestampLike;
  resolvedAt: FirestoreTimestampLike | null;
}
