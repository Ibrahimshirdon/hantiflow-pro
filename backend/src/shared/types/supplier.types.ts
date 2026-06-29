import type { Timestamp } from "firebase-admin/firestore";

export interface SupplierCompany {
  id: string;
  supplierId: string;
  name: string;
  description: string | null;
  location: string;
  managerName: string;
  contactPhone: string;
  contactEmail: string;
  registrationDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  supplierName: string;
  companyId: string;
  companyName: string;
  companyManagerName: string;
  name: string;
  description: string | null;
  category: string;
  brand: string | null;
  unitType: string;
  quantityInStock: number;
  wholesalePrice: number;
  sellingPrice: number;
  minimumStockLevel: number;
  taxRateId: string | null;
  expiryDate: Timestamp | null;
  // Purchase/source info — where this product was bought from.
  purchasePrice: number;
  purchaseDate: Timestamp;
  batchNumber: string;
  warehouseLocation: string;
  // Set once any quantity of this product has been submitted into the real
  // inventory system — the same internal product is reused on every
  // subsequent submission rather than creating a duplicate.
  linkedProductId: string | null;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StockRequest {
  id: string;
  supplierProductId: string;
  productName: string;
  companyName: string;
  supplierId: string;
  quantity: number;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  requestedBy: string;
  requestedByName: string;
  requestedByRole: string;
  resultingProductId: string | null;
  rejectionReason: string | null;
  createdAt: Timestamp;
  respondedAt: Timestamp | null;
}

// A supplier's own, unsolicited request to push a quantity of their product
// into the real inventory — distinct from StockRequest, where the admin is
// the one initiating. Created in "pending" status and never moves any stock
// until an admin/manager reviews and approves it.
export interface SupplierSubmission {
  id: string;
  supplierProductId: string;
  productName: string;
  companyName: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  status: "pending" | "approved" | "rejected";
  resultingProductId: string | null;
  rejectionReason: string | null;
  createdAt: Timestamp;
  respondedAt: Timestamp | null;
}
