export interface SalesTrendPoint {
  date: string;
  total: number;
}

export interface SalesForecast {
  historical: { date: string; actual: number }[];
  forecast: { date: string; predicted: number }[];
}

export interface TopProduct {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
}

export interface BestCustomer {
  customerId: string;
  customerName: string;
  orderCount: number;
  totalSpent: number;
}

export interface InventoryInsights {
  totalProducts: number;
  totalInventoryValue: number;
  lowStockCount: number;
  expiringBatchesCount: number;
  valueByCategory: { category: string; value: number }[];
}
