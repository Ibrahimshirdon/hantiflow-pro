import { db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import type { TaxRate } from "../../shared/types/sales.types.js";
import type { CreateTaxRateInput, UpdateTaxRateInput } from "./taxRate.types.js";

const collection = () => db.collection("taxRates");

async function unsetOtherDefaults(exceptId?: string) {
  const snap = await collection().where("isDefault", "==", true).get();
  await Promise.all(
    snap.docs
      .filter((d) => d.id !== exceptId)
      .map((d) => d.ref.update({ isDefault: false })),
  );
}

export async function createTaxRate(input: CreateTaxRateInput) {
  const ref = collection().doc();
  if (input.isDefault) {
    await unsetOtherDefaults();
  }
  await ref.set({ name: input.name, rate: input.rate, isDefault: input.isDefault });
  return { id: ref.id };
}

export async function listTaxRates() {
  const snap = await collection().orderBy("name").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TaxRate);
}

export async function updateTaxRate(id: string, input: UpdateTaxRateInput) {
  const ref = collection().doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(404, "Tax rate not found");
  }
  if (input.isDefault) {
    await unsetOtherDefaults(id);
  }
  await ref.update({ ...input });
  return { id };
}
