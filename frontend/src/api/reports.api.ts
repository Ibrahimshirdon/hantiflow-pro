import { apiClient, type ApiSuccess } from "./client";
import type {
  InventoryReportRow,
  InventoryReportSummary,
  SalesReportRow,
  SalesReportSummary,
} from "@/types/reports.types";

export async function getSalesReport(dateFrom: string, dateTo: string) {
  const { data } = await apiClient.get<
    ApiSuccess<{ summary: SalesReportSummary; rows: SalesReportRow[] }>
  >("/reports/sales", { params: { dateFrom, dateTo, format: "json" } });
  return data.data;
}

export async function getInventoryReport() {
  const { data } = await apiClient.get<
    ApiSuccess<{ summary: InventoryReportSummary; rows: InventoryReportRow[] }>
  >("/reports/inventory", { params: { format: "json" } });
  return data.data;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadSalesReport(
  dateFrom: string,
  dateTo: string,
  format: "pdf" | "excel",
) {
  const { data } = await apiClient.get<Blob>("/reports/sales", {
    params: { dateFrom, dateTo, format },
    responseType: "blob",
  });
  downloadBlob(data, `sales-report.${format === "pdf" ? "pdf" : "xlsx"}`);
}

export async function downloadInventoryReport(format: "pdf" | "excel") {
  const { data } = await apiClient.get<Blob>("/reports/inventory", {
    params: { format },
    responseType: "blob",
  });
  downloadBlob(data, `inventory-report.${format === "pdf" ? "pdf" : "xlsx"}`);
}
