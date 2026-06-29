import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import type { Category } from "../../shared/types/inventory.types.js";
import type { CreateCategoryInput, UpdateCategoryInput } from "./category.types.js";

const collection = () => db.collection("categories");

export async function createCategory(input: CreateCategoryInput) {
  const ref = collection().doc();
  await ref.set({
    name: input.name,
    description: input.description ?? null,
    parentCategoryId: input.parentCategoryId ?? null,
    imageUrl: input.imageUrl ?? null,
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
}

export async function listCategories() {
  const snap = await collection().orderBy("name").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const ref = collection().doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(404, "Category not found");
  }
  await ref.update({ ...input });
  return { id };
}
