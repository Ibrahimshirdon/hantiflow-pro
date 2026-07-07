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

  // Lazy expiry check: any active batch past its expiry date is automatically
  // written off — status → "expired", quantity → 0, totalStock decremented,
  // and a damage adjustment created for the audit trail.
  const now = new Date();
  const toExpire = batches.filter(
    (b) => b.status === "active" && b.quantity > 0 && b.expiryDate && b.expiryDate.toDate() < now,
  );

  if (toExpire.length > 0) {
    const totalExpiredQty = toExpire.reduce((sum, b) => sum + b.quantity, 0);

    const productRef = db.collection("products").doc(productId);
    const productSnap = await productRef.get();
    const product = productSnap.data() as Product;
    const newTotalStock = Math.max(0, product.totalStock - totalExpiredQty);

    const writeBatch = db.batch();

    for (const batch of toExpire) {
      writeBatch.update(db.collection("batches").doc(batch.id), {
        status: "expired",
        quantity: 0,
      });
      writeBatch.set(db.collection("stockAdjustments").doc(), {
        productId,
        batchId: batch.id,
        type: "damage",
        quantityChange: -batch.quantity,
        reason: "Expired stock — written off automatically",
        performedBy: "system",
        createdAt: FieldValue.serverTimestamp(),
      });
      // Reflect write in local array so the response is accurate
      batch.status = "expired";
      batch.quantity = 0;
    }

    writeBatch.update(productRef, {
      totalStock: newTotalStock,
      isLowStock: newTotalStock <= product.reorderLevel,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await writeBatch.commit();
  }

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

  // Also surface products that have a product-level expiryDate set by an admin
  // but whose batches carry no batch-level expiry date.
  // Single-field range query only — avoids needing a composite index.
  const productExpirySnap = await db
    .collection("products")
    .where("expiryDate", "<=", cutoff)
    .get();

  const batchProductIds = new Set(batches.map((b) => b.productId));
  for (const doc of productExpirySnap.docs) {
    const product = { id: doc.id, ...doc.data() } as Product;
    if (!product.expiryDate || !product.isActive || batchProductIds.has(product.id)) continue;
    batches.push({
      id: `product-expiry-${product.id}`,
      productId: product.id,
      productName: product.name,
      batchNumber: "—",
      quantity: product.totalStock,
      costPrice: product.costPrice,
      manufactureDate: null,
      expiryDate: product.expiryDate,
      receivedDate: product.createdAt,
      status: "active",
    });
  }

  batches.sort((a, b) => (a.expiryDate?.toMillis() ?? 0) - (b.expiryDate?.toMillis() ?? 0));

  // Join product names for batch-level entries (synthetic entries already carry productName).
  const batchOnlyProductIds = [...new Set(batches.filter((b) => !b.productName).map((b) => b.productId))];
  const productSnaps = await Promise.all(batchOnlyProductIds.map((id) => db.collection("products").doc(id).get()));
  const nameById = new Map(
    productSnaps.filter((s) => s.exists).map((s) => [s.id, (s.data() as Product).name]),
  );

  return batches.map((b) => ({ ...b, productName: b.productName ?? nameById.get(b.productId) ?? "—" }));
}
