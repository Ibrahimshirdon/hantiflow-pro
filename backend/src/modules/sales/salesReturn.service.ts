import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import { recordAuditLog } from "../../shared/utils/auditLog.js";
import { createNotification } from "../../shared/utils/notifications.js";
import type { AuthenticatedUser } from "../../shared/types/auth.types.js";
import type { Product } from "../../shared/types/inventory.types.js";
import type { SalesOrder, SalesReturn, SalesReturnItem } from "../../shared/types/sales.types.js";
import type { CreateReturnInput } from "./salesReturn.types.js";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function createSalesReturn(
  orderId: string,
  input: CreateReturnInput,
  actor: AuthenticatedUser,
) {
  // 1. Load order
  const orderSnap = await db.collection("salesOrders").doc(orderId).get();
  if (!orderSnap.exists) throw new AppError(404, "Order not found");
  const order = { id: orderSnap.id, ...orderSnap.data() } as SalesOrder;

  if (order.status !== "completed") {
    throw new AppError(400, "Only completed orders can be returned");
  }

  // 2. How much has already been returned for each product on this order?
  const existingSnap = await db
    .collection("salesReturns")
    .where("orderId", "==", orderId)
    .get();
  const alreadyReturned = new Map<string, number>();
  for (const doc of existingSnap.docs) {
    for (const item of (doc.data() as SalesReturn).items) {
      alreadyReturned.set(item.productId, (alreadyReturned.get(item.productId) ?? 0) + item.quantity);
    }
  }

  // 3. Validate quantities and build return line items
  const orderItemMap = new Map(order.items.map((i) => [i.productId, i]));
  const returnItems: SalesReturnItem[] = [];
  let refundTotal = 0;

  for (const ri of input.items) {
    const oi = orderItemMap.get(ri.productId);
    if (!oi) throw new AppError(400, `Product ${ri.productId} was not in this order`);

    const maxReturnable = oi.quantity - (alreadyReturned.get(ri.productId) ?? 0);
    if (ri.quantity > maxReturnable) {
      throw new AppError(
        400,
        `Cannot return ${ri.quantity} of "${oi.productName}" — only ${maxReturnable} returnable`,
      );
    }

    const lineRefund = round2(oi.unitPrice * ri.quantity);
    refundTotal = round2(refundTotal + lineRefund);

    returnItems.push({
      productId: ri.productId,
      productName: oi.productName,
      batchId: ri.batchId ?? oi.batchId,
      quantity: ri.quantity,
      unitPrice: oi.unitPrice,
      lineRefund,
    });
  }

  // 4. Resolve actor display name
  const actorSnap = await db.collection("users").doc(actor.uid).get();
  const processedByName = actorSnap.exists
    ? (actorSnap.data() as { displayName: string }).displayName
    : actor.email;

  // 5. Determine refund method: wallet only if original payment was wallet AND customer exists
  const refundMethod: "wallet" | "cash" =
    order.paymentMethod === "wallet" && order.customerId ? "wallet" : "cash";

  // 6. Read products so we can update isLowStock correctly
  const uniqueProductIds = [...new Set(returnItems.map((i) => i.productId))];
  const productSnaps = await Promise.all(
    uniqueProductIds.map((id) => db.collection("products").doc(id).get()),
  );
  const productMap = new Map(
    productSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as Product]),
  );

  // Accumulate returned qty per product (multiple return lines can share a product)
  const returnedQtyByProduct = new Map<string, number>();
  for (const item of returnItems) {
    returnedQtyByProduct.set(
      item.productId,
      (returnedQtyByProduct.get(item.productId) ?? 0) + item.quantity,
    );
  }

  // 7. Build and commit WriteBatch
  const returnRef = db.collection("salesReturns").doc();
  const batch = db.batch();

  // Stock restoration
  for (const item of returnItems) {
    if (item.batchId) {
      batch.update(db.collection("batches").doc(item.batchId), {
        quantity: FieldValue.increment(item.quantity),
        status: "active",
      });
    }
    batch.set(db.collection("stockAdjustments").doc(), {
      productId: item.productId,
      batchId: item.batchId,
      type: "correction",
      quantityChange: item.quantity,
      reason: `Sales return — Order ${order.orderNumber}: ${input.reason}`,
      performedBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  // Product totalStock + isLowStock update (once per unique product)
  for (const [productId, returnedQty] of returnedQtyByProduct) {
    const product = productMap.get(productId);
    if (!product) continue;
    const newStock = product.totalStock + returnedQty;
    batch.update(db.collection("products").doc(productId), {
      totalStock: newStock,
      isLowStock: newStock <= product.reorderLevel,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // Wallet refund
  if (refundMethod === "wallet" && order.customerId) {
    batch.update(db.collection("customerProfiles").doc(order.customerId), {
      walletBalance: FieldValue.increment(refundTotal),
    });
    batch.set(db.collection("walletTransactions").doc(), {
      customerId: order.customerId,
      type: "credit",
      amount: refundTotal,
      reason: "refund",
      relatedOrderId: orderId,
      balanceAfter: null,
      performedBy: actor.uid,
      performedByName: processedByName,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  // SalesReturn document
  batch.set(returnRef, {
    orderId,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    customerName: order.customerName,
    paymentMethod: order.paymentMethod,
    items: returnItems,
    refundTotal,
    refundMethod,
    reason: input.reason,
    processedBy: actor.uid,
    processedByName,
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  // Post-commit side-effects
  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "SALES_RETURN_PROCESSED",
    entityType: "salesOrder",
    entityId: orderId,
    after: { returnId: returnRef.id, refundTotal, refundMethod, reason: input.reason },
  });

  if (refundMethod === "wallet" && order.customerId) {
    await createNotification({
      userId: order.customerId,
      title: "Refund processed",
      message: `A refund of $${refundTotal.toFixed(2)} has been credited to your wallet for order ${order.orderNumber}.`,
      type: "wallet",
      relatedEntityId: returnRef.id,
    });
  }

  return { id: returnRef.id, refundTotal, refundMethod };
}

export async function listReturnsForOrder(orderId: string) {
  const snap = await db
    .collection("salesReturns")
    .where("orderId", "==", orderId)
    .get();
  const returns = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SalesReturn);
  return returns.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}
