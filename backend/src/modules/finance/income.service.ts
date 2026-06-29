import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";
import type { AuthenticatedUser } from "../../shared/types/auth.types.js";
import type { OtherIncome } from "../../shared/types/finance.types.js";
import type { CreateIncomeInput } from "./income.types.js";

const collection = () => db.collection("otherIncome");

export async function createIncome(input: CreateIncomeInput, actor: AuthenticatedUser) {
  const ref = collection().doc();
  await ref.set({
    source: input.source,
    amount: input.amount,
    date: input.date,
    recordedBy: actor.uid,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
}

export async function listIncome(filters: { dateFrom?: Date; dateTo?: Date }) {
  let query: FirebaseFirestore.Query = collection();
  if (filters.dateFrom) query = query.where("date", ">=", filters.dateFrom);
  if (filters.dateTo) query = query.where("date", "<=", filters.dateTo);
  const snap = await query.get();
  const income = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as OtherIncome);
  return income.sort((a, b) => b.date.toMillis() - a.date.toMillis());
}
