import { Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import type { Discount } from "../../shared/types/sales.types.js";
import type { CreateDiscountInput, UpdateDiscountInput } from "./discount.types.js";

const collection = () => db.collection("discounts");

export interface DiscountEligibleItem {
  productId: string;
  categoryId: string;
  lineSubtotal: number;
}

export function computeDiscountAmount(discount: Discount, items: DiscountEligibleItem[]): number {
  const eligibleSubtotal = items
    .filter((item) => {
      if (discount.appliesTo === "all") return true;
      if (discount.appliesTo === "category") return discount.targetIds.includes(item.categoryId);
      return discount.targetIds.includes(item.productId);
    })
    .reduce((sum, item) => sum + item.lineSubtotal, 0);

  if (discount.minPurchaseAmount && eligibleSubtotal < discount.minPurchaseAmount) {
    return 0;
  }
  if (discount.type === "percentage") {
    return eligibleSubtotal * (discount.value / 100);
  }
  return Math.min(discount.value, eligibleSubtotal);
}

export function isDiscountCurrentlyValid(discount: Discount): boolean {
  const now = Timestamp.now().toMillis();
  if (!discount.isActive) return false;
  if (discount.validFrom.toMillis() > now || discount.validTo.toMillis() < now) return false;
  if (discount.usageLimit !== null && discount.usedCount >= discount.usageLimit) return false;
  return true;
}

export async function createDiscount(input: CreateDiscountInput) {
  const existing = await collection().where("code", "==", input.code).limit(1).get();
  if (!existing.empty) {
    throw new AppError(409, "A discount with this code already exists");
  }
  const ref = collection().doc();
  await ref.set({
    code: input.code,
    type: input.type,
    value: input.value,
    appliesTo: input.appliesTo,
    targetIds: input.targetIds,
    minPurchaseAmount: input.minPurchaseAmount ?? null,
    validFrom: input.validFrom,
    validTo: input.validTo,
    usageLimit: input.usageLimit ?? null,
    usedCount: 0,
    isActive: true,
  });
  return { id: ref.id };
}

export async function listDiscounts() {
  const snap = await collection().orderBy("code").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Discount);
}

export async function updateDiscount(id: string, input: UpdateDiscountInput) {
  const ref = collection().doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(404, "Discount not found");
  }
  await ref.update({ ...input });
  return { id };
}

export async function previewDiscount(code: string, items: DiscountEligibleItem[]) {
  const snap = await collection().where("code", "==", code.toUpperCase()).limit(1).get();
  if (snap.empty) {
    throw new AppError(404, "Invalid discount code");
  }
  const discount = { id: snap.docs[0]!.id, ...snap.docs[0]!.data() } as Discount;
  if (!isDiscountCurrentlyValid(discount)) {
    throw new AppError(400, "This discount code is not currently valid");
  }
  const discountAmount = computeDiscountAmount(discount, items);
  if (discountAmount === 0) {
    throw new AppError(400, "Order does not meet the requirements for this discount");
  }
  return { discountId: discount.id, discountAmount };
}
