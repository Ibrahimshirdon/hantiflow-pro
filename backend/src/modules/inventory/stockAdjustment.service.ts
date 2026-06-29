import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import { recordAuditLog } from "../../shared/utils/auditLog.js";
import type { AuthenticatedUser } from "../../shared/types/auth.types.js";
import type { Batch, Product, StockAdjustment } from "../../shared/types/inventory.types.js";
import type { CreateStockAdjustmentInput } from "./stockAdjustment.types.js";
import { notifyIfNewlyLowStock } from "./lowStockAlert.js";

export async function createStockAdjustment(
  input: CreateStockAdjustmentInput,
  actor: AuthenticatedUser,
) {
  const adjustmentRef = db.collection("stockAdjustments").doc();
  const batchRef = db.collection("batches").doc(input.batchId);
  const productRef = db.collection("products").doc(input.productId);

  let lowStockTransition: Parameters<typeof notifyIfNewlyLowStock>[0][number] | null = null;

  await db.runTransaction(async (tx) => {
    const [batchSnap, productSnap] = await Promise.all([tx.get(batchRef), tx.get(productRef)]);

    if (!batchSnap.exists) throw new AppError(404, "Batch not found");
    if (!productSnap.exists) throw new AppError(404, "Product not found");

    const batch = batchSnap.data() as Batch;
    const product = productSnap.data() as Product;

    const newBatchQty = batch.quantity + input.quantityChange;
    if (newBatchQty < 0) {
      throw new AppError(400, `Adjustment would make batch quantity negative (current: ${batch.quantity})`);
    }

    tx.update(batchRef, {
      quantity: newBatchQty,
      status: newBatchQty === 0 ? "depleted" : "active",
    });

    const newTotalStock = product.totalStock + input.quantityChange;
    const newIsLowStock = newTotalStock <= product.reorderLevel;
    tx.update(productRef, {
      totalStock: newTotalStock,
      isLowStock: newIsLowStock,
      updatedAt: FieldValue.serverTimestamp(),
    });
    lowStockTransition = {
      productId: input.productId,
      productName: product.name,
      wasLowStock: product.isLowStock,
      isLowStock: newIsLowStock,
      totalStock: newTotalStock,
      reorderLevel: product.reorderLevel,
      maxStockLevel: product.maxStockLevel,
    };

    tx.set(adjustmentRef, {
      productId: input.productId,
      batchId: input.batchId,
      type: input.type,
      quantityChange: input.quantityChange,
      reason: input.reason,
      performedBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  if (lowStockTransition) {
    await notifyIfNewlyLowStock([lowStockTransition]);
  }

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "STOCK_ADJUSTED",
    entityType: "product",
    entityId: input.productId,
    after: { type: input.type, quantityChange: input.quantityChange, reason: input.reason },
  });

  return { id: adjustmentRef.id };
}

export async function listStockAdjustments(productId?: string) {
  let query: FirebaseFirestore.Query = db.collection("stockAdjustments");
  if (productId) {
    query = query.where("productId", "==", productId);
  }
  const snap = await query.get();
  const adjustments = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StockAdjustment);
  return adjustments.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}
