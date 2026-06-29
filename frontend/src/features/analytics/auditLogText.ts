import type { TFunction } from "i18next";
import type { AuditLog } from "@/types/security.types";

export type ActivityTone = "success" | "warning" | "destructive" | "info";

const TONE_BY_ACTION: Record<string, ActivityTone> = {
  SUPPLIER_SUBMISSION_REQUESTED: "info",
  SUPPLIER_SUBMISSION_APPROVED: "success",
  SUPPLIER_SUBMISSION_REJECTED: "destructive",
  SUPPLIER_PRODUCT_SUBMITTED_TO_INVENTORY: "success",
  DELIVERY_ISSUE_REPORTED: "destructive",
  DELIVERY_ISSUE_RESOLVED: "success",
  DELIVERY_CONFIRMED_BY_CUSTOMER: "success",
  SYSTEM_RESET: "destructive",
  CUSTOMER_STATUS_CHANGED: "warning",
  CUSTOMER_WALLET_ADJUSTED: "info",
  CUSTOMER_LOYALTY_ADJUSTED: "info",
  CUSTOMER_CREDIT_LIMIT_SET: "info",
  LOAN_REPAYMENT_RECORDED: "success",
  LOAN_REPAID_FROM_WALLET: "success",
  LOAN_DUE_DATE_SET: "info",
  STOCK_REQUEST_CREATED: "info",
  STOCK_REQUEST_APPROVED: "success",
  STOCK_REQUEST_REJECTED: "destructive",
  PRODUCT_APPROVED: "success",
  PRODUCT_DELETED: "destructive",
  STOCK_ADJUSTED: "warning",
  STOCK_RECEIVED: "success",
  USER_CREATED: "success",
  USER_STATUS_CHANGED: "warning",
  USER_DELETED: "destructive",
  USER_PASSWORD_RESET: "info",
  REPORT_EXPORTED: "info",
};

// snake_case ACTION enum -> "Action" fallback for any action type not yet
// mapped to a sentence below — keeps new audit actions readable by default
// instead of silently falling back to the raw enum string.
function titleCaseFallback(action: string): string {
  return action
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

// Turns a raw AuditLog entry into a human sentence for the dashboard's
// "Recent activity" feed — the curated business-event log (auditLogs),
// not the generic per-request technical log (activityLogs, shown in
// Settings > Activity Logs) which intentionally stays raw for security
// review.
export function describeAuditLog(
  log: AuditLog,
  userName: string,
  t: TFunction<"analytics">,
): { text: string; tone: ActivityTone } {
  const after = log.after ?? {};
  const before = log.before ?? {};
  const key = `dashboardPage.recentActivity.actions.${log.action}`;
  const text = t(key, {
    user: userName,
    defaultValue: "",
    ...after,
    ...before,
  });

  return {
    text: text || `${userName} — ${titleCaseFallback(log.action)}`,
    tone: TONE_BY_ACTION[log.action] ?? "info",
  };
}
