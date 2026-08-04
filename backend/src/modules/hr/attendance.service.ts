import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import type { AuthenticatedUser } from "../../shared/types/auth.types.js";
import type { AttendanceRecord } from "../../shared/types/hr.types.js";
import type { RecordAttendanceInput } from "./attendance.types.js";

const collection = () => db.collection("attendanceRecords");

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function nowTimeString() {
  return new Date().toTimeString().slice(0, 5);
}

// Doc id == `${staffId}_${date}` — recording attendance again for the same
// staff member on the same day corrects the existing record (upsert)
// instead of creating a duplicate row for that day.
//
// Shared by two self-service entry points — a staff member hitting their
// own "check in/out" button, and a face-recognition kiosk match (see
// faceAttendance.service.ts) — so everything about *who*, *when*, and
// *what* is server-enforced rather than trusted from the request body:
// date is always today (no backdating), status is always "present" (you
// can't mark yourself absent/on leave — that's still an admin/manager
// call), and checkIn/checkOut are stamped from the server clock. The first
// call of the day for a given staffId records check-in; a second call the
// same day (a record already exists) records check-out instead, without
// needing an explicit "which action" field.
export async function recordSelfAttendance(staffId: string, recordedBy: string) {
  const date = todayDateString();

  const userSnap = await db.collection("users").doc(staffId).get();
  if (!userSnap.exists) {
    throw new AppError(404, "Staff member not found");
  }
  const user = userSnap.data() as { displayName: string };

  const docId = `${staffId}_${date}`;
  const ref = collection().doc(docId);
  const existing = await ref.get();
  const existingData = existing.data();

  const checkIn = existing.exists ? (existingData!.checkIn as string | null) : nowTimeString();
  const checkOut = existing.exists ? nowTimeString() : null;
  const notes = existing.exists ? (existingData!.notes as string | null) : null;
  const checkedOut = existing.exists;

  await ref.set({
    staffId,
    staffName: user.displayName,
    date,
    status: "present",
    checkIn,
    checkOut,
    notes,
    recordedBy,
    createdAt: existing.exists ? existingData!.createdAt : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { id: docId, staffName: user.displayName, checkedOut };
}

export async function recordAttendance(input: RecordAttendanceInput, actor: AuthenticatedUser) {
  if (actor.role === "staff") {
    return recordSelfAttendance(actor.uid, actor.uid);
  }

  const userSnap = await db.collection("users").doc(input.staffId).get();
  if (!userSnap.exists) {
    throw new AppError(404, "Staff member not found");
  }
  const user = userSnap.data() as { displayName: string };

  const docId = `${input.staffId}_${input.date}`;
  const ref = collection().doc(docId);
  const existing = await ref.get();

  await ref.set({
    staffId: input.staffId,
    staffName: user.displayName,
    date: input.date,
    status: input.status,
    checkIn: input.checkIn ?? null,
    checkOut: input.checkOut ?? null,
    notes: input.notes ?? null,
    recordedBy: actor.uid,
    createdAt: existing.exists ? existing.data()!.createdAt : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { id: docId };
}

// Mirrors the rest of the app's "single equality filter via Firestore, the
// rest filtered in memory" convention (avoids composite-index requirements
// from combining an equality filter with a range filter on a different
// field — see security.service.ts's listAuditLogs for the same pattern).
export async function listAttendance(filters: {
  staffId?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  let query: FirebaseFirestore.Query = collection();
  if (filters.staffId) {
    query = query.where("staffId", "==", filters.staffId);
  } else if (filters.date) {
    query = query.where("date", "==", filters.date);
  }
  const snap = await query.get();
  let records = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AttendanceRecord);

  if (filters.staffId && filters.date) records = records.filter((r) => r.date === filters.date);
  if (filters.dateFrom) records = records.filter((r) => r.date >= filters.dateFrom!);
  if (filters.dateTo) records = records.filter((r) => r.date <= filters.dateTo!);

  return records.sort((a, b) => b.date.localeCompare(a.date));
}

export async function deleteAttendance(id: string) {
  const ref = collection().doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(404, "Attendance record not found");
  }
  await ref.delete();
  return { id };
}
