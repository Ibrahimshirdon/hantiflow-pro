import { apiClient, type ApiSuccess } from "./client";
import type { AttendanceRecord, StaffSalary } from "@/types/hr.types";

// Salaries
export interface SetSalaryInput {
  staffId: string;
  monthlySalary: number;
  effectiveDate: string;
  notes?: string;
}

export async function listSalaries() {
  const { data } = await apiClient.get<ApiSuccess<StaffSalary[]>>("/hr/salaries");
  return data.data;
}

export async function setSalary(input: SetSalaryInput) {
  const { data } = await apiClient.post<ApiSuccess<{ id: string }>>("/hr/salaries", input);
  return data.data;
}

export async function deleteSalary(staffId: string) {
  await apiClient.delete(`/hr/salaries/${staffId}`);
}

// Attendance
export interface RecordAttendanceInput {
  staffId: string;
  date: string;
  status: "present" | "absent" | "late" | "half_day" | "leave";
  checkIn?: string;
  checkOut?: string;
  notes?: string;
}

export async function listAttendance(filters?: {
  staffId?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const { data } = await apiClient.get<ApiSuccess<AttendanceRecord[]>>("/hr/attendance", {
    params: filters,
  });
  return data.data;
}

export async function recordAttendance(input: RecordAttendanceInput) {
  const { data } = await apiClient.post<ApiSuccess<{ id: string }>>("/hr/attendance", input);
  return data.data;
}

export async function deleteAttendance(id: string) {
  await apiClient.delete(`/hr/attendance/${id}`);
}
