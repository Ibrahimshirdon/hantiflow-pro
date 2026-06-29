import { apiClient, type ApiSuccess } from "./client";
import type {
  BestCustomer,
  InventoryInsights,
  SalesForecast,
  SalesTrendPoint,
  TopProduct,
} from "@/types/analytics.types";

export async function getSalesTrend(daysBack = 30) {
  const { data } = await apiClient.get<ApiSuccess<SalesTrendPoint[]>>("/analytics/sales-trend", {
    params: { daysBack },
  });
  return data.data;
}

export async function getSalesForecast(daysBack = 30, daysAhead = 7) {
  const { data } = await apiClient.get<ApiSuccess<SalesForecast>>("/analytics/sales-forecast", {
    params: { daysBack, daysAhead },
  });
  return data.data;
}

export async function getTopProducts(daysBack = 30, limit = 5) {
  const { data } = await apiClient.get<ApiSuccess<TopProduct[]>>("/analytics/top-products", {
    params: { daysBack, limit },
  });
  return data.data;
}

export async function getBestCustomers(daysBack = 30, limit = 5) {
  const { data } = await apiClient.get<ApiSuccess<BestCustomer[]>>("/analytics/best-customers", {
    params: { daysBack, limit },
  });
  return data.data;
}

export async function getInventoryInsights() {
  const { data } = await apiClient.get<ApiSuccess<InventoryInsights>>("/analytics/inventory-insights");
  return data.data;
}
