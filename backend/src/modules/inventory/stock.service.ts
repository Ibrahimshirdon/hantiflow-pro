import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import { notifyRole } from "../../shared/utils/notifications.js";
import { recordAuditLog } from "../../shared/utils/auditLog.js";
import type { AuthenticatedUser } from "../../shared/types/auth.types.js";
import type { Batch, GoodsReceipt, Product } from "../../shared/types/inventory.types.js";
import type { ReceiveStockInput } from "./stock.types.js";

export async function receiveStock(
  input: ReceiveStockInput,
  actor: AuthenticatedUser,
  photoUrl?: string,
) {
  const productRef = db.collection("products").doc(input.productId);
  const batchRef = db.collection("batches").doc();
  const goodsReceiptRef = db.collection("goodsReceipts").doc();

  const goodQuantity =
    input.quantity - input.damagedQuantity - input.missingQuantity - input.returnedQuantity;
  if (goodQuantity < 0) {
    throw new AppError(400, "Damaged + missing + returned quantity cannot exceed received quantity");
  }
  const hasDiscrepancy = input.damagedQuantity + input.missingQuantity + input.returnedQuantity > 0;

  await db.runTransaction(async (tx) => {
    const productSnap = await tx.get(productRef);
    if (!productSnap.exists) {
      throw new AppError(404, "Product not found");
    }
    const product = productSnap.data() as Product;

    if (goodQuantity > 0) {
      const newTotalStock = product.totalStock + goodQuantity;
      tx.set(batchRef, {
        productId: input.productId,
        batchNumber: input.batchNumber,
        quantity: goodQuantity,
        costPrice: input.costPrice,
        manufactureDate: input.manufactureDate ?? null,
        expiryDate: input.expiryDate ?? null,
        receivedDate: FieldValue.serverTimestamp(),
        status: "active",
      });
      tx.update(productRef, {
        totalStock: newTotalStock,
        isLowStock: newTotalStock <= product.reorderLevel,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    tx.set(goodsReceiptRef, {
      productId: input.productId,
      productName: product.name,
      batchId: goodQuantity > 0 ? batchRef.id : null,
      receivedQuantity: input.quantity,
      damagedQuantity: input.damagedQuantity,
      missingQuantity: input.missingQuantity,
      returnedQuantity: input.returnedQuantity,
      goodQuantity,
      qualityIssue: input.qualityIssue ?? null,
      photoUrls: photoUrl ? [photoUrl] : [],
      notes: input.notes ?? null,
      receivedBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "STOCK_RECEIVED",
    entityType: "goodsReceipt",
    entityId: goodsReceiptRef.id,
    after: {
      productId: input.productId,
      receivedQuantity: input.quantity,
      goodQuantity,
      damagedQuantity: input.damagedQuantity,
      missingQuantity: input.missingQuantity,
      returnedQuantity: input.returnedQuantity,
    },
  });

  if (hasDiscrepancy) {
    await notifyRole(["admin"], {
      title: "Damaged or missing goods received",
      message: `Receiving stock: ${input.damagedQuantity} damaged, ${input.missingQuantity} missing, ${input.returnedQuantity} returned to supplier.`,
      type: "system",
      relatedEntityId: goodsReceiptRef.id,
    });
  }

  return { batchId: goodQuantity > 0 ? batchRef.id : null, goodsReceiptId: goodsReceiptRef.id, goodQuantity };
}

export async function listGoodsReceipts(filters: { productId?: string; receivedBy?: string }) {
  let query: FirebaseFirestore.Query = db.collection("goodsReceipts");
  if (filters.productId) query = query.where("productId", "==", filters.productId);
  if (filters.receivedBy) query = query.where("receivedBy", "==", filters.receivedBy);
  const snap = await query.get();
  const receipts = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GoodsReceipt);
  return receipts.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export async function listBatchesForProduct(productId: string) {
  const snap = await db.collection("batches").where("productId", "==", productId).get();
  const batches = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Batch);
  return batches.sort((a, b) => {
    const aTime = a.expiryDate?.toMillis() ?? Infinity;
    const bTime = b.expiryDate?.toMillis() ?? Infinity;
    return aTime - bTime;
  });
}

export async function listExpiringBatches(daysAhead: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);

  const snap = await db
    .collection("batches")
    .where("status", "==", "active")
    .where("expiryDate", "<=", cutoff)
    .get();

  const batches = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Batch);
  batches.sort((a, b) => (a.expiryDate?.toMillis() ?? 0) - (b.expiryDate?.toMillis() ?? 0));

  // Batch docs only store productId — joined here (rather than denormalizing
  // productName onto every Batch at write time) so the dashboard's expiring-
  // batches widget can show a product name without a separate per-row fetch.
  const productIds = [...new Set(batches.map((b) => b.productId))];
  const productSnaps = await Promise.all(productIds.map((id) => db.collection("products").doc(id).get()));
  const nameById = new Map(
    productSnaps.filter((s) => s.exists).map((s) => [s.id, (s.data() as Product).name]),
  );

  return batches.map((b) => ({ ...b, productName: nameById.get(b.productId) ?? "—" }));
}
