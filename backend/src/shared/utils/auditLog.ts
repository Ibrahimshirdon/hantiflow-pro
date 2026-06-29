import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";
import type { UserRole } from "../types/auth.types.js";

interface AuditLogInput {
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export async function recordAuditLog(input: AuditLogInput) {
  await db.collection("auditLogs").add({
    ...input,
    createdAt: FieldValue.serverTimestamp(),
  });
}
