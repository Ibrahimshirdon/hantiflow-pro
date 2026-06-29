import type { Address } from "./delivery.types";

interface FirestoreTimestampLike {
  _seconds: number;
  _nanoseconds: number;
}

export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
}

export interface Discount {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  appliesTo: "all" | "category" | "product";
  targetIds: string[];
  minPurchaseAmount: number | null;
  validFrom: FirestoreTimestampLike;
  validTo: FirestoreTimestampLike;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
}

export interface SalesOrderItem {
  productId: string;
  productName: string;
  batchId: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  lineTotal: number;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  type: "pos" | "online";
  customerId: string | null;
  customerName: string | null;
  items: SalesOrderItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  fulfillmentType: "pickup" | "delivery" | null;
  deliveryFee: number;
  deliveryAddress: Address | null;
  grandTotal: number;
  paymentStatus: "paid" | "partial" | "unpaid";
  paymentMethod: "cash" | "card" | "wallet" | "mobile_money" | "loan";
  status: "pending" | "completed" | "cancelled";
  createdBy: string;
  createdByName: string;
  createdByRole: string;
  completedBy: string | null;
  completedByName: string | null;
  completedAt: FirestoreTimestampLike | null;
  createdAt: FirestoreTimestampLike;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  salesOrderId: string;
  itemsSnapshot: SalesOrderItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  status: "paid" | "unpaid";
  createdAt: FirestoreTimestampLike;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  salesOrderId: string;
  amountPaid: number;
  paymentMethod: string;
  changeGiven: number;
  issuedBy: string;
  createdAt: FirestoreTimestampLike;
}
