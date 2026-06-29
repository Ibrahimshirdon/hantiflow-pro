import { apiClient, type ApiSuccess } from "./client";
import type { ActivityLog, AuditLog } from "@/types/security.types";

export async function listAuditLogs(filters?: { userId?: string; entityType?: string }) {
  const { data } = await apiClient.get<ApiSuccess<AuditLog[]>>("/security/audit-logs", {
    params: filters,
  });
  return data.data;
}

export async function listActivityLogs(filters?: { userId?: string }) {
  const { data } = await apiClient.get<ApiSuccess<ActivityLog[]>>("/security/activity-logs", {
    params: filters,
  });
  return data.data;
}
