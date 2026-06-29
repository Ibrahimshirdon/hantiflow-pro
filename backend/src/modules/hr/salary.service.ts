import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import type { AuthenticatedUser } from "../../shared/types/auth.types.js";
import type { StaffSalary } from "../../shared/types/hr.types.js";
import type { SetSalaryInput } from "./salary.types.js";

const collection = () => db.collection("salaries");

// Doc id == staffId, so this is a plain upsert: setting a new salary for a
// staff member who already has one just overwrites it (createdAt preserved).
export async function setSalary(input: SetSalaryInput, actor: AuthenticatedUser) {
  const userSnap = await db.collection("users").doc(input.staffId).get();
  if (!userSnap.exists) {
    throw new AppError(404, "Staff member not found");
  }
  const user = userSnap.data() as { displayName: string; role: string };

  const ref = collection().doc(input.staffId);
  const existing = await ref.get();
  await ref.set({
    staffId: input.staffId,
    staffName: user.displayName,
    role: user.role,
    monthlySalary: input.monthlySalary,
    effectiveDate: input.effectiveDate,
    notes: input.notes ?? null,
    updatedBy: actor.uid,
    createdAt: existing.exists ? existing.data()!.createdAt : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { id: input.staffId };
}

export async function listSalaries() {
  const snap = await collection().get();
  const salaries = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StaffSalary);
  return salaries.sort((a, b) => a.staffName.localeCompare(b.staffName));
}

export async function deleteSalary(staffId: string) {
  const ref = collection().doc(staffId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(404, "Salary record not found");
  }
  await ref.delete();
  return { id: staffId };
}
