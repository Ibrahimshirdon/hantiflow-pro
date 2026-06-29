import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import { recordAuditLog } from "../../shared/utils/auditLog.js";
import { createNotification, notifyRole } from "../../shared/utils/notifications.js";
import type { AuthenticatedUser } from "../../shared/types/auth.types.js";
import type { SupplierSubmission } from "../../shared/types/supplier.types.js";
import type { CreateSubmissionInput, RejectSubmissionInput } from "./supplierSubmission.types.js";
import { applySupplierProductToInventory, getOwnedSupplierProduct } from "./supplierProduct.service.js";

const collection = () => db.collection("supplierSubmissions");

// Supplier-initiated request to push stock into the real inventory system.
// Unlike StockRequest (admin asks, supplier fulfills), here the supplier is
// the one asking — so nothing moves until an admin/manager approves it via
// approveSubmission below. No quantityInStock changes happen here either;
// that's deferred to approval time so a rejected/pending submission never
// understates what the supplier has on hand.
export async function createSubmission(
  supplierProductId: string,
  input: CreateSubmissionInput,
  actor: AuthenticatedUser,
) {
  const { product } = await getOwnedSupplierProduct(supplierProductId, actor);

  if (input.quantity > product.quantityInStock) {
    throw new AppError(
      400,
      `Cannot submit ${input.quantity} — only ${product.quantityInStock} currently held for "${product.name}"`,
    );
  }

  const ref = collection().doc();
  await ref.set({
    supplierProductId,
    productName: product.name,
    companyName: product.companyName,
    supplierId: actor.uid,
    supplierName: product.supplierName,
    quantity: input.quantity,
    status: "pending",
    resultingProductId: null,
    rejectionReason: null,
    createdAt: FieldValue.serverTimestamp(),
    respondedAt: null,
  });

  await notifyRole(["admin", "manager"], {
    title: "Supplier submission awaiting approval",
    message: `${product.supplierName} wants to submit ${input.quantity} ${product.unitType} of "${product.name}" (${product.companyName}) to inventory.`,
    type: "system",
    relatedEntityId: ref.id,
  });

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "SUPPLIER_SUBMISSION_REQUESTED",
    entityType: "supplierSubmission",
    entityId: ref.id,
    after: { supplierProductId, quantity: input.quantity },
  });

  return { id: ref.id };
}

export async function listSubmissions(filters: { supplierId?: string }) {
  let query: FirebaseFirestore.Query = collection();
  if (filters.supplierId) query = query.where("supplierId", "==", filters.supplierId);
  const snap = await query.get();
  const submissions = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SupplierSubmission);
  return submissions.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

async function getPendingSubmission(id: string) {
  const ref = collection().doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(404, "Submission not found");
  }
  const submission = { id: snap.id, ...snap.data() } as SupplierSubmission;
  if (submission.status !== "pending") {
    throw new AppError(400, `This submission was already ${submission.status}`);
  }
  return { ref, submission };
}

export async function approveSubmission(id: string, actor: AuthenticatedUser) {
  const { ref, submission } = await getPendingSubmission(id);

  const applyResult = await applySupplierProductToInventory(
    submission.supplierProductId,
    { quantity: submission.quantity },
    actor,
  );

  await ref.update({
    status: "approved",
    resultingProductId: applyResult.productId,
    respondedAt: FieldValue.serverTimestamp(),
  });

  await createNotification({
    userId: submission.supplierId,
    title: "Submission approved",
    message: `Your submission of ${submission.quantity} units of "${submission.productName}" was approved and is now in inventory.`,
    type: "system",
    relatedEntityId: id,
  });

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "SUPPLIER_SUBMISSION_APPROVED",
    entityType: "supplierSubmission",
    entityId: id,
    after: { productId: applyResult.productId, quantity: submission.quantity },
  });

  return { id, ...applyResult };
}

export async function rejectSubmission(
  id: string,
  input: RejectSubmissionInput,
  actor: AuthenticatedUser,
) {
  const { ref, submission } = await getPendingSubmission(id);

  await ref.update({
    status: "rejected",
    rejectionReason: input.reason ?? null,
    respondedAt: FieldValue.serverTimestamp(),
  });

  await createNotification({
    userId: submission.supplierId,
    title: "Submission rejected",
    message: `Your submission of ${submission.quantity} units of "${submission.productName}" was rejected.${input.reason ? ` Reason: ${input.reason}` : ""}`,
    type: "system",
    relatedEntityId: id,
  });

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "SUPPLIER_SUBMISSION_REJECTED",
    entityType: "supplierSubmission",
    entityId: id,
    after: { reason: input.reason ?? null },
  });

  return { id };
}
