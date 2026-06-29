import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import { recordAuditLog } from "../../shared/utils/auditLog.js";
import { createNotification } from "../../shared/utils/notifications.js";
import type { AuthenticatedUser } from "../../shared/types/auth.types.js";
import type { StockRequest, SupplierProduct } from "../../shared/types/supplier.types.js";
import type { CreateStockRequestInput, RejectStockRequestInput } from "./stockRequest.types.js";
import { applySupplierProductToInventory } from "./supplierProduct.service.js";

const collection = () => db.collection("stockRequests");

export async function createStockRequest(input: CreateStockRequestInput, actor: AuthenticatedUser) {
  const productSnap = await db.collection("supplierProducts").doc(input.supplierProductId).get();
  if (!productSnap.exists) {
    throw new AppError(404, "Supplier product not found");
  }
  const product = productSnap.data() as SupplierProduct;

  if (input.quantity > product.quantityInStock) {
    throw new AppError(
      400,
      `Cannot request ${input.quantity} — only ${product.quantityInStock} currently held for "${product.name}"`,
    );
  }

  const actorSnap = await db.collection("users").doc(actor.uid).get();
  const requestedByName = actorSnap.exists
    ? (actorSnap.data() as { displayName: string }).displayName
    : actor.email;

  const ref = collection().doc();
  await ref.set({
    supplierProductId: input.supplierProductId,
    productName: product.name,
    companyName: product.companyName,
    supplierId: product.supplierId,
    quantity: input.quantity,
    message: input.message ?? null,
    status: "pending",
    requestedBy: actor.uid,
    requestedByName,
    requestedByRole: actor.role,
    resultingProductId: null,
    rejectionReason: null,
    createdAt: FieldValue.serverTimestamp(),
    respondedAt: null,
  });

  await createNotification({
    userId: product.supplierId,
    title: "Stock requested",
    message: `${requestedByName} requested ${input.quantity} ${product.unitType} of "${product.name}" (${product.companyName}).${input.message ? ` Note: ${input.message}` : ""}`,
    type: "system",
    relatedEntityId: ref.id,
  });

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "STOCK_REQUEST_CREATED",
    entityType: "stockRequest",
    entityId: ref.id,
    after: { supplierProductId: input.supplierProductId, quantity: input.quantity },
  });

  return { id: ref.id };
}

export async function listStockRequests(filters: { supplierId?: string }) {
  let query: FirebaseFirestore.Query = collection();
  if (filters.supplierId) query = query.where("supplierId", "==", filters.supplierId);
  const snap = await query.get();
  const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StockRequest);
  return requests.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

async function getOwnedPendingStockRequest(id: string, actor: AuthenticatedUser) {
  const ref = collection().doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(404, "Stock request not found");
  }
  const request = { id: snap.id, ...snap.data() } as StockRequest;
  if (request.supplierId !== actor.uid) {
    throw new AppError(403, "You can only respond to your own stock requests");
  }
  if (request.status !== "pending") {
    throw new AppError(400, `This request was already ${request.status}`);
  }
  return { ref, request };
}

// Approving a request immediately submits that quantity into inventory —
// no extra admin sign-off needed here since the admin already expressed
// intent by creating the request in the first place. Reuses
// applySupplierProductToInventory directly so it gets the exact same
// batch/low-stock/audit bookkeeping as an admin-approved direct submission.
export async function approveStockRequest(id: string, actor: AuthenticatedUser) {
  const { ref, request } = await getOwnedPendingStockRequest(id, actor);

  const submitResult = await applySupplierProductToInventory(
    request.supplierProductId,
    { quantity: request.quantity },
    actor,
  );

  await ref.update({
    status: "approved",
    resultingProductId: submitResult.productId,
    respondedAt: FieldValue.serverTimestamp(),
  });

  await createNotification({
    userId: request.requestedBy,
    title: "Stock request approved",
    message: `Your request for ${request.quantity} units of "${request.productName}" was approved and submitted to inventory.`,
    type: "system",
    relatedEntityId: id,
  });

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "STOCK_REQUEST_APPROVED",
    entityType: "stockRequest",
    entityId: id,
    after: { productId: submitResult.productId, quantity: request.quantity },
  });

  return { id, ...submitResult };
}

export async function rejectStockRequest(
  id: string,
  input: RejectStockRequestInput,
  actor: AuthenticatedUser,
) {
  const { ref, request } = await getOwnedPendingStockRequest(id, actor);

  await ref.update({
    status: "rejected",
    rejectionReason: input.reason ?? null,
    respondedAt: FieldValue.serverTimestamp(),
  });

  await createNotification({
    userId: request.requestedBy,
    title: "Stock request rejected",
    message: `Your request for ${request.quantity} units of "${request.productName}" was rejected.${input.reason ? ` Reason: ${input.reason}` : ""}`,
    type: "system",
    relatedEntityId: id,
  });

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "STOCK_REQUEST_REJECTED",
    entityType: "stockRequest",
    entityId: id,
    after: { reason: input.reason ?? null },
  });

  return { id };
}
