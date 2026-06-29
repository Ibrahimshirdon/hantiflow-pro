import { notifyRole } from "../../shared/utils/notifications.js";

interface LowStockTransition {
  productId: string;
  productName: string;
  wasLowStock: boolean;
  isLowStock: boolean;
  totalStock: number;
  reorderLevel: number;
  maxStockLevel?: number | null;
}

export function recommendedReorderQuantity(
  totalStock: number,
  reorderLevel: number,
  maxStockLevel?: number | null,
): number {
  const target = maxStockLevel ?? reorderLevel * 2;
  return Math.max(target - totalStock, reorderLevel);
}

// Fires only on the false -> true transition, never while a product stays
// low across multiple stock movements, to avoid notification spam.
export async function notifyIfNewlyLowStock(transitions: LowStockTransition[]) {
  const newlyLow = transitions.filter((t) => t.isLowStock && !t.wasLowStock);
  await Promise.all(
    newlyLow.map((t) => {
      const suggestedQty = recommendedReorderQuantity(t.totalStock, t.reorderLevel, t.maxStockLevel);
      return notifyRole(["admin", "manager", "staff"], {
        title: "Low stock alert",
        message: `${t.productName} is low on stock (${t.totalStock} left, reorder level ${t.reorderLevel}). Recommended reorder quantity: ${suggestedQty}.`,
        type: "system",
        relatedEntityId: t.productId,
      });
    }),
  );
}
