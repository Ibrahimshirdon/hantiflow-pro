interface FirestoreTimestampLike {
  _seconds: number;
  _nanoseconds: number;
}

export interface StaffSalary {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  monthlySalary: number;
  effectiveDate: FirestoreTimestampLike;
  notes: string | null;
  updatedBy: string;
  createdAt: FirestoreTimestampLike;
  updatedAt: FirestoreTimestampLike;
}

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
  createdAt: FirestoreTimestampLike;
  updatedAt: FirestoreTimestampLike;
}
