import { z } from "zod";

export const recordAttendanceSchema = z.object({
  staffId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  status: z.enum(["present", "absent", "late", "half_day", "leave"]),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  notes: z.string().optional(),
});
export type RecordAttendanceInput = z.infer<typeof recordAttendanceSchema>;
