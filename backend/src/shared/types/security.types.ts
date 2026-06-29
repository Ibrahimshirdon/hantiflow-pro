import type { Timestamp } from "firebase-admin/firestore";
import type { UserRole } from "./auth.types.js";

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: Timestamp;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
}
