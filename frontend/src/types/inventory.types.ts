export interface Category {
  id: string;
  name: string;
  description?: string;
  parentCategoryId: string | null;
  imageUrl?: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  taxRateId: string | null;
  images: string[];
  reorderLevel: number;
  maxStockLevel?: number | null;
  trackBatches: boolean;
  totalStock: number;
  isLowStock: boolean;
  isActive: boolean;
  approvalStatus: "pending" | "approved";
}

interface FirestoreTimestampLike {
  _seconds: number;
  _nanoseconds: number;
}

export interface Batch {
  id: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  costPrice: number;
  manufactureDate: FirestoreTimestampLike | null;
  expiryDate: FirestoreTimestampLike | null;
  receivedDate: FirestoreTimestampLike;
  status: "active" | "depleted" | "expired";
  // Only populated by listExpiringBatches — absent everywhere else.
  productName?: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  batchId: string;
  type: "damage" | "correction" | "loss" | "recount";
  quantityChange: number;
  reason: string;
  performedBy: string;
  createdAt: FirestoreTimestampLike;
}

export interface GoodsReceipt {
  id: string;
  productId: string;
  productName: string;
  batchId: string | null;
  receivedQuantity: number;
  damagedQuantity: number;
  missingQuantity: number;
  returnedQuantity: number;
  goodQuantity: number;
  qualityIssue: "damaged" | "expired" | "wrong_item" | "returned_to_supplier" | null;
  photoUrls: string[];
  notes: string | null;
  receivedBy: string;
  createdAt: FirestoreTimestampLike;
}

export function toDate(ts: FirestoreTimestampLike | null | undefined): Date | null {
  if (!ts) return null;
  return new Date(ts._seconds * 1000);
}
