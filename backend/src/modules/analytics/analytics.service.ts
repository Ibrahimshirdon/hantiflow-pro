import { db } from "../../config/firebase.js";
import type { SalesOrder } from "../../shared/types/sales.types.js";
import type { Product } from "../../shared/types/inventory.types.js";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function dateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

// Same pattern established in the finance module: filter by the single
// equality field Firestore can index automatically, then narrow to the
// date window in memory rather than combining equality + range filters
// (which would need yet another composite index).
async function getCompletedSalesSince(daysBack: number): Promise<SalesOrder[]> {
  const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;
  const snap = await db.collection("salesOrders").where("status", "==", "completed").get();
  return snap.docs
    .map((d) => d.data() as SalesOrder)
    .filter((o) => o.createdAt.toMillis() >= cutoff);
}

export async function getSalesTrend(daysBack: number) {
  const sales = await getCompletedSalesSince(daysBack);
  const byDate = new Map<string, number>();
  sales.forEach((o) => {
    const key = dateKey(o.createdAt.toMillis());
    byDate.set(key, round2((byDate.get(key) ?? 0) + o.grandTotal));
  });
  return Array.from(byDate, ([date, total]) => ({ date, total })).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

function linearRegression(points: { x: number; y: number }[]) {
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: n > 0 ? sumY / n : 0 };
  }
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// A simple, explainable linear-regression forecast over the trailing
// window — not a trained ML model. Documented as a deliberate scope choice:
// a least-squares trend line is a legitimate, transparent forecasting
// technique and doesn't require external ML infrastructure.
export async function getSalesForecast(daysBack: number, daysAhead: number) {
  const trend = await getSalesTrend(daysBack);

  const byDateTotal = new Map(trend.map((t) => [t.date, t.total]));
  const today = new Date();
  const series: { x: number; y: number; date: string }[] = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    series.push({ x: daysBack - 1 - i, y: byDateTotal.get(key) ?? 0, date: key });
  }

  const { slope, intercept } = linearRegression(series.map(({ x, y }) => ({ x, y })));

  const forecast = [];
  for (let i = 1; i <= daysAhead; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const x = series.length - 1 + i;
    forecast.push({
      date: d.toISOString().slice(0, 10),
      predicted: round2(Math.max(0, slope * x + intercept)),
    });
  }

  return {
    historical: series.map(({ date, y }) => ({ date, actual: y })),
    forecast,
  };
}

export async function getTopProducts(daysBack: number, limit: number) {
  const sales = await getCompletedSalesSince(daysBack);
  const byProduct = new Map<string, { productName: string; quantitySold: number; revenue: number }>();

  sales.forEach((o) => {
    o.items.forEach((item) => {
      const existing = byProduct.get(item.productId) ?? {
        productName: item.productName,
        quantitySold: 0,
        revenue: 0,
      };
      existing.quantitySold += item.quantity;
      existing.revenue = round2(existing.revenue + item.lineTotal);
      byProduct.set(item.productId, existing);
    });
  });

  return Array.from(byProduct, ([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getBestCustomers(daysBack: number, limit: number) {
  const sales = await getCompletedSalesSince(daysBack);
  const byCustomer = new Map<string, { customerName: string; orderCount: number; totalSpent: number }>();

  sales.forEach((o) => {
    if (!o.customerId) return;
    const existing = byCustomer.get(o.customerId) ?? {
      customerName: o.customerName ?? "Unknown",
      orderCount: 0,
      totalSpent: 0,
    };
    existing.orderCount += 1;
    existing.totalSpent = round2(existing.totalSpent + o.grandTotal);
    byCustomer.set(o.customerId, existing);
  });

  return Array.from(byCustomer, ([customerId, data]) => ({ customerId, ...data }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);
}

export async function getInventoryInsights() {
  const productsSnap = await db.collection("products").where("isActive", "==", true).get();
  const products = productsSnap.docs.map((d) => d.data() as Product);

  let totalInventoryValue = 0;
  let lowStockCount = 0;
  const valueByCategory = new Map<string, number>();

  products.forEach((p) => {
    const value = p.totalStock * p.costPrice;
    totalInventoryValue += value;
    if (p.isLowStock) lowStockCount += 1;
    valueByCategory.set(p.categoryName, round2((valueByCategory.get(p.categoryName) ?? 0) + value));
  });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 30);
  const batchSnap = await db
    .collection("batches")
    .where("status", "==", "active")
    .where("expiryDate", "<=", cutoff)
    .get();
  const expiringBatchesCount = batchSnap.docs.length;

  return {
    totalProducts: products.length,
    totalInventoryValue: round2(totalInventoryValue),
    lowStockCount,
    expiringBatchesCount,
    valueByCategory: Array.from(valueByCategory, ([category, value]) => ({ category, value })).sort(
      (a, b) => b.value - a.value,
    ),
  };
}

