import { db } from "../../config/firebase.js";
import type { ActivityLog, AuditLog } from "../../shared/types/security.types.js";

// Fetch the most recent N by the single-field orderBy (auto-indexed, no
// composite index needed) and filter by the optional fields in memory,
// rather than combining an equality filter with orderBy in one Firestore
// query — same pattern adopted after the earlier missing-index incidents.
export async function listAuditLogs(filters: { userId?: string; entityType?: string }) {
  const snap = await db.collection("auditLogs").orderBy("createdAt", "desc").limit(200).get();
  let logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditLog);
  if (filters.userId) logs = logs.filter((l) => l.userId === filters.userId);
  if (filters.entityType) logs = logs.filter((l) => l.entityType === filters.entityType);
  return logs;
}

export async function listActivityLogs(filters: { userId?: string }) {
  const snap = await db.collection("activityLogs").orderBy("createdAt", "desc").limit(200).get();
  let logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ActivityLog);
  if (filters.userId) logs = logs.filter((l) => l.userId === filters.userId);
  return logs;
}
