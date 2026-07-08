import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import { recordAuditLog } from "../../shared/utils/auditLog.js";
import type { AuthenticatedUser } from "../../shared/types/auth.types.js";
import type { Batch, Product, StocktakeItem, StocktakeSession } from "../../shared/types/inventory.types.js";
import type { CommitStocktakeSessionInput, CreateStocktakeSessionInput } from "./stocktakeSession.types.js";
import { createStockAdjustment } from "./stockAdjustment.service.js";

const sessionsCol = () => db.collection("stocktakeSessions");
const itemsCol = (sessionId: string) => sessionsCol().doc(sessionId).collection("items");

export async function createStocktakeSession(
  input: CreateStocktakeSessionInput,
  actor: AuthenticatedUser,
): Promise<{ id: string }> {
  const actorSnap = await db.collection("users").doc(actor.uid).get();
  const startedByName = actorSnap.exists
    ? ((actorSnap.data() as { displayName?: string }).displayName ?? actor.email)
    : actor.email;

  // Only count batches that physically have stock (active or expired but present)
  const batchesSnap = await db.collection("batches").where("quantity", ">", 0).get();
  const batches = batchesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Batch);

  if (batches.length === 0) {
    throw new AppError(400, "No stock found — there is nothing to count.");
  }

  // Bulk-read product names
  const productIds = [...new Set(batches.map((b) => b.productId))];
  const productSnaps = await Promise.all(
    productIds.map((id) => db.collection("products").doc(id).get()),
  );
  const productNameMap = new Map<string, string>();
  productSnaps.forEach((snap) => {
    if (snap.exists) productNameMap.set(snap.id, (snap.data() as Product).name);
  });

  const sessionRef = sessionsCol().doc();
  const batch = db.batch();

  batch.set(sessionRef, {
    startedBy: actor.uid,
    startedByName,
    status: "in_progress",
    notes: input.notes ?? null,
    itemCount: batches.length,
    discrepancyCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    committedAt: null,
  });

  for (const b of batches) {
    const itemRef = itemsCol(sessionRef.id).doc();
    batch.set(itemRef, {
      sessionId: sessionRef.id,
      productId: b.productId,
      productName: productNameMap.get(b.productId) ?? "Unknown",
      batchId: b.id,
      batchNumber: b.batchNumber,
      systemQty: b.quantity,
    });
  }

  await batch.commit();

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "STOCKTAKE_SESSION_CREATED",
    entityType: "stocktakeSession",
    entityId: sessionRef.id,
    after: { itemCount: batches.length },
  });

  return { id: sessionRef.id };
}

export async function listStocktakeSessions() {
  const snap = await sessionsCol().orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StocktakeSession);
}

export async function getStocktakeSession(sessionId: string) {
  const sessionSnap = await sessionsCol().doc(sessionId).get();
  if (!sessionSnap.exists) throw new AppError(404, "Stocktake session not found");
  const session = { id: sessionSnap.id, ...sessionSnap.data() } as StocktakeSession;

  const itemsSnap = await itemsCol(sessionId).get();
  const items = itemsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as StocktakeItem)
    .sort((a, b) => a.productName.localeCompare(b.productName));

  return { ...session, items };
}

export async function commitStocktakeSession(
  sessionId: string,
  input: CommitStocktakeSessionInput,
  actor: AuthenticatedUser,
) {
  const sessionSnap = await sessionsCol().doc(sessionId).get();
  if (!sessionSnap.exists) throw new AppError(404, "Stocktake session not found");
  const session = sessionSnap.data() as StocktakeSession;
  if (session.status === "committed") {
    throw new AppError(400, "This session has already been committed");
  }

  const itemsSnap = await itemsCol(sessionId).get();
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as StocktakeItem);

  // Only apply adjustments where countedQty is provided and differs from system
  const discrepancies = items.filter(
    (item) =>
      input.counts[item.id] !== undefined && input.counts[item.id] !== item.systemQty,
  );

  for (const item of discrepancies) {
    const countedQty = input.counts[item.id];
    await createStockAdjustment(
      {
        productId: item.productId,
        batchId: item.batchId,
        type: "recount",
        quantityChange: countedQty - item.systemQty,
        reason: `Stocktake session ${sessionId}`,
      },
      actor,
    );
  }

  await sessionsCol().doc(sessionId).update({
    status: "committed",
    discrepancyCount: discrepancies.length,
    committedAt: FieldValue.serverTimestamp(),
  });

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "STOCKTAKE_SESSION_COMMITTED",
    entityType: "stocktakeSession",
    entityId: sessionId,
    after: { discrepancyCount: discrepancies.length, totalItems: items.length },
  });

  return { discrepancyCount: discrepancies.length };
}
