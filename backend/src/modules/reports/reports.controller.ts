import type { Request, Response } from "express";
import { AppError } from "../../shared/utils/AppError.js";
import { endOfDayUtc } from "../../shared/utils/dateRange.js";
import { recordAuditLog } from "../../shared/utils/auditLog.js";
import * as reportsService from "./reports.service.js";
import { generateSalesReportPdf, generateInventoryReportPdf } from "./pdfExport.js";
import { generateSalesReportExcel, generateInventoryReportExcel } from "./excelExport.js";

function parseRange(req: Request) {
  const { dateFrom, dateTo } = req.query;
  if (!dateFrom || !dateTo) {
    throw new AppError(400, "dateFrom and dateTo query parameters are required");
  }
  return {
    dateFrom: new Date(dateFrom as string),
    dateTo: endOfDayUtc(dateTo as string),
    dateFromLabel: dateFrom as string,
    dateToLabel: dateTo as string,
  };
}

function sendFile(res: Response, buffer: Buffer, filename: string, contentType: string) {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
}

export async function salesReport(req: Request, res: Response) {
  const range = parseRange(req);
  const format = (req.query.format as string | undefined) ?? "json";
  const { summary, rows } = await reportsService.getSalesReport(range);

  if (format === "json") {
    return res.json({ success: true, data: { summary, rows } });
  }

  const label = { dateFrom: range.dateFromLabel, dateTo: range.dateToLabel };
  if (format === "pdf") {
    const buffer = await generateSalesReportPdf(label, summary, rows);
    await recordAuditLog({
      userId: req.user!.uid,
      userName: req.user!.email,
      role: req.user!.role,
      action: "REPORT_EXPORTED",
      entityType: "report",
      entityId: "sales-report-pdf",
      after: label,
    });
    return sendFile(res, buffer, "sales-report.pdf", "application/pdf");
  }
  if (format === "excel") {
    const buffer = await generateSalesReportExcel(label, summary, rows);
    await recordAuditLog({
      userId: req.user!.uid,
      userName: req.user!.email,
      role: req.user!.role,
      action: "REPORT_EXPORTED",
      entityType: "report",
      entityId: "sales-report-excel",
      after: label,
    });
    return sendFile(
      res,
      buffer,
      "sales-report.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  }
  throw new AppError(400, "format must be json, pdf, or excel");
}

export async function inventoryReport(req: Request, res: Response) {
  const format = (req.query.format as string | undefined) ?? "json";
  const { summary, rows } = await reportsService.getInventoryReport();

  if (format === "json") {
    return res.json({ success: true, data: { summary, rows } });
  }

  if (format === "pdf") {
    const buffer = await generateInventoryReportPdf(summary, rows);
    await recordAuditLog({
      userId: req.user!.uid,
      userName: req.user!.email,
      role: req.user!.role,
      action: "REPORT_EXPORTED",
      entityType: "report",
      entityId: "inventory-report-pdf",
    });
    return sendFile(res, buffer, "inventory-report.pdf", "application/pdf");
  }
  if (format === "excel") {
    const buffer = await generateInventoryReportExcel(summary, rows);
    await recordAuditLog({
      userId: req.user!.uid,
      userName: req.user!.email,
      role: req.user!.role,
      action: "REPORT_EXPORTED",
      entityType: "report",
      entityId: "inventory-report-excel",
    });
    return sendFile(
      res,
      buffer,
      "inventory-report.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  }
  throw new AppError(400, "format must be json, pdf, or excel");
}
