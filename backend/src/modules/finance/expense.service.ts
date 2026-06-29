import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import { uploadBuffer } from "../../shared/utils/uploadFile.js";
import type { AuthenticatedUser } from "../../shared/types/auth.types.js";
import type { Expense } from "../../shared/types/finance.types.js";
import type { CreateExpenseInput } from "./expense.types.js";

const collection = () => db.collection("expenses");

export async function createExpense(
  input: CreateExpenseInput,
  actor: AuthenticatedUser,
  receiptBuffer?: Buffer,
) {
  const attachmentUrl = receiptBuffer
    ? await uploadBuffer(receiptBuffer, { folder: "expense-receipts", resourceType: "image" })
    : null;

  const ref = collection().doc();
  await ref.set({
    category: input.category,
    amount: input.amount,
    description: input.description ?? null,
    paidTo: input.paidTo ?? null,
    paymentMethod: input.paymentMethod,
    date: input.date,
    recordedBy: actor.uid,
    attachmentUrl,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { id: ref.id };
}

export async function listExpenses(filters: { dateFrom?: Date; dateTo?: Date; category?: string }) {
  let query: FirebaseFirestore.Query = collection();
  if (filters.dateFrom) query = query.where("date", ">=", filters.dateFrom);
  if (filters.dateTo) query = query.where("date", "<=", filters.dateTo);
  if (filters.category) query = query.where("category", "==", filters.category);
  const snap = await query.get();
  const expenses = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense);
  return expenses.sort((a, b) => b.date.toMillis() - a.date.toMillis());
}

export async function deleteExpense(id: string) {
  const ref = collection().doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(404, "Expense not found");
  }
  await ref.delete();
  return { id };
}
