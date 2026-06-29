import { db } from "../../config/firebase.js";
import type { SalesOrder } from "../../shared/types/sales.types.js";
import type { Product } from "../../shared/types/inventory.types.js";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface DateRange {
  dateFrom: Date;
  dateTo: Date;
}

// Same established pattern: filter by the single equality field Firestore
// auto-indexes, narrow to the date window in memory.
async function getCompletedSalesInRange({ dateFrom, dateTo }: DateRange): Promise<SalesOrder[]> {
  const snap = await db.collection("salesOrders").where("status", "==", "completed").get();
  const from = dateFrom.getTime();
  const to = dateTo.getTime();
  return snap.docs
    .map((d) => d.data() as SalesOrder)
    .filter((o) => {
      const ms = o.createdAt.toMillis();
      return ms >= from && ms <= to;
    })
    .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
}

export interface SalesReportRow {
  orderNumber: string;
  date: string;
  customerName: string;
  itemCount: number;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paymentMethod: string;
}

export async function getSalesReport(range: DateRange) {
  const orders = await getCompletedSalesInRange(range);

  const rows: SalesReportRow[] = orders.map((o) => ({
    orderNumber: o.orderNumber,
    date: new Date(o.createdAt.toMillis()).toLocaleString(),
    customerName: o.customerName ?? "Walk-in",
    itemCount: o.items.length,
    subtotal: o.subtotal,
    discountTotal: o.discountTotal,
    taxTotal: o.taxTotal,
    grandTotal: o.grandTotal,
    paymentMethod: o.paymentMethod,
  }));

  const summary = {
    orderCount: orders.length,
    subtotal: round2(rows.reduce((s, r) => s + r.subtotal, 0)),
    discountTotal: round2(rows.reduce((s, r) => s + r.discountTotal, 0)),
    taxTotal: round2(rows.reduce((s, r) => s + r.taxTotal, 0)),
    grandTotal: round2(rows.reduce((s, r) => s + r.grandTotal, 0)),
  };

  return { summary, rows };
}

export interface InventoryReportRow {
  sku: string;
  name: string;
  categoryName: string;
  unit: string;
  totalStock: number;
  reorderLevel: number;
  costPrice: number;
  sellingPrice: number;
  stockValue: number;
  isLowStock: boolean;
  stockStatus: "low" | "warning" | "good";
}

// Fixed absolute thresholds for this report's at-a-glance Status column —
// deliberately separate from Product.isLowStock, which stays relative to
// each product's own admin-set reorderLevel and continues to drive
// low-stock notifications/requisitions elsewhere unchanged.
function classifyStockStatus(totalStock: number): "low" | "warning" | "good" {
  if (totalStock <= 10) return "low";
  if (totalStock <= 50) return "warning";
  return "good";
}

export async function getInventoryReport() {
  const snap = await db.collection("products").where("isActive", "==", true).get();
  const products = snap.docs.map((d) => d.data() as Product).sort((a, b) => a.name.localeCompare(b.name));

  const rows: InventoryReportRow[] = products.map((p) => ({
    sku: p.sku,
    name: p.name,
    categoryName: p.categoryName,
    unit: p.unit,
    totalStock: p.totalStock,
    reorderLevel: p.reorderLevel,
    costPrice: p.costPrice,
    sellingPrice: p.sellingPrice,
    stockValue: round2(p.totalStock * p.costPrice),
    isLowStock: p.isLowStock,
    stockStatus: classifyStockStatus(p.totalStock),
  }));

  const summary = {
    totalProducts: rows.length,
    totalInventoryValue: round2(rows.reduce((s, r) => s + r.stockValue, 0)),
    lowStockCount: rows.filter((r) => r.isLowStock).length,
  };

  return { summary, rows };
}
