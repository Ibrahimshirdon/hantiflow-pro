import type { Timestamp } from "firebase-admin/firestore";
import type { UserRole } from "./auth.types.js";

// One doc per staff member (doc id == staffId) — setting a new salary
// overwrites the previous one rather than keeping a history, matching how
// this app's other "current state" records (e.g. CustomerProfile) work.
export interface StaffSalary {
  id: string;
  staffId: string;
  staffName: string;
  role: UserRole;
  monthlySalary: number;
  effectiveDate: Timestamp;
  notes: string | null;
  updatedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// One doc per staff member per day (doc id == `${staffId}_${date}`) so
// recording attendance twice for the same day corrects the existing record
// instead of creating a duplicate.
export interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  status: "present" | "absent" | "late" | "half_day" | "leave";
  checkIn: string | null;
  checkOut: string | null;
  notes: string | null;
  recordedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
