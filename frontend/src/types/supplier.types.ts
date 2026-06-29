interface FirestoreTimestampLike {
  _seconds: number;
  _nanoseconds: number;
}

export interface SupplierCompany {
  id: string;
  supplierId: string;
  name: string;
  description: string | null;
  location: string;
  managerName: string;
  contactPhone: string;
  contactEmail: string;
  registrationDate: FirestoreTimestampLike;
  createdAt: FirestoreTimestampLike;
  updatedAt: FirestoreTimestampLike;
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
  expiryDate: FirestoreTimestampLike | null;
  purchasePrice: number;
  purchaseDate: FirestoreTimestampLike;
  batchNumber: string;
  warehouseLocation: string;
  linkedProductId: string | null;
  isActive: boolean;
  createdAt: FirestoreTimestampLike;
  updatedAt: FirestoreTimestampLike;
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
  createdAt: FirestoreTimestampLike;
  respondedAt: FirestoreTimestampLike | null;
}

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
  createdAt: FirestoreTimestampLike;
  respondedAt: FirestoreTimestampLike | null;
}
