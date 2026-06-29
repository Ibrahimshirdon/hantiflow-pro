interface FirestoreTimestampLike {
  _seconds: number;
  _nanoseconds: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: FirestoreTimestampLike;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  metadata?: Record<string, unknown>;
  createdAt: FirestoreTimestampLike;
}
