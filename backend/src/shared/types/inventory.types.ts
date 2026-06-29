import type { Timestamp } from "firebase-admin/firestore";

export interface Category {
  id: string;
  name: string;
  description?: string;
  parentCategoryId: string | null;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Timestamp;
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
  // "pending" products were created via a supplier submission and are
  // invisible everywhere (POS/shop/availableForSale listings) until an admin
  // approves them; hand-created (admin/staff) products are always "approved".
  approvalStatus: "pending" | "approved";
  // Set when this product was created via a supplier's "submit to inventory"
  // action rather than created directly — null for hand-created products.
  supplierProductId?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Batch {
  id: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  costPrice: number;
  manufactureDate: Timestamp | null;
  expiryDate: Timestamp | null;
  receivedDate: Timestamp;
  status: "active" | "depleted" | "expired";
  // Only populated by listExpiringBatches (joined against products at read
  // time) — absent everywhere else a Batch is returned.
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
  createdAt: Timestamp;
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
  createdAt: Timestamp;
}
