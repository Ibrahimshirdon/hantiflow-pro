import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import { createNotification, notifyRole } from "../../shared/utils/notifications.js";
import { recordAuditLog } from "../../shared/utils/auditLog.js";
import type { AuthenticatedUser } from "../../shared/types/auth.types.js";
import type { Delivery, DeliveryIssue } from "../../shared/types/delivery.types.js";
import type { SalesOrder } from "../../shared/types/sales.types.js";
import { markOrderCompleted } from "../sales/salesOrder.service.js";
import type {
  ConfirmDeliveryInput,
  CreateDeliveryInput,
  ReportDeliveryIssueInput,
  ResolveDeliveryIssueInput,
  UpdateDeliveryStatusInput,
} from "./delivery.types.js";

const collection = () => db.collection("deliveries");
const issuesCollection = () => db.collection("deliveryIssues");

const VALID_TRANSITIONS: Record<string, string[]> = {
  assigned: ["picked_up", "failed"],
  picked_up: ["in_transit", "failed"],
  in_transit: ["delivered", "failed"],
};

function assertAccess(delivery: Delivery, actor: AuthenticatedUser) {
  if (actor.role === "driver" && delivery.driverId !== actor.uid) {
    throw new AppError(403, "This delivery is not assigned to you");
  }
  if (actor.role === "customer" && delivery.customerId !== actor.uid) {
    throw new AppError(403, "This delivery does not belong to you");
  }
}

async function addStatusEvent(deliveryId: string, status: string, note: string | null, updatedBy: string) {
  await collection().doc(deliveryId).collection("statusHistory").add({
    status,
    note,
    updatedBy,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function createDelivery(input: CreateDeliveryInput, actor: AuthenticatedUser) {
  const orderSnap = await db.collection("salesOrders").doc(input.salesOrderId).get();
  if (!orderSnap.exists) {
    throw new AppError(404, "Sales order not found");
  }
  const order = orderSnap.data() as SalesOrder;
  if (!order.customerId) {
    throw new AppError(400, "This order has no customer to deliver to");
  }

  const existing = await collection().where("salesOrderId", "==", input.salesOrderId).limit(1).get();
  if (!existing.empty) {
    throw new AppError(409, "A delivery already exists for this order");
  }

  const ref = collection().doc();
  await ref.set({
    salesOrderId: input.salesOrderId,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    driverId: null,
    status: "unassigned",
    pickupAddress: input.pickupAddress,
    dropoffAddress: input.dropoffAddress,
    proofOfDeliveryUrl: null,
    notes: input.notes ?? null,
    assignedAt: null,
    pickedUpAt: null,
    deliveredAt: null,
    customerConfirmedAt: null,
    rating: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  await addStatusEvent(ref.id, "unassigned", "Delivery created", actor.uid);

  return { id: ref.id };
}

export async function listDeliveries(filters: { status?: string; driverId?: string }) {
  let query: FirebaseFirestore.Query = collection();
  if (filters.status) query = query.where("status", "==", filters.status);
  if (filters.driverId) query = query.where("driverId", "==", filters.driverId);
  const snap = await query.get();
  const deliveries = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Delivery);
  return deliveries.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export async function getDeliveryById(id: string, actor: AuthenticatedUser) {
  const snap = await collection().doc(id).get();
  if (!snap.exists) {
    throw new AppError(404, "Delivery not found");
  }
  const delivery = { id: snap.id, ...snap.data() } as Delivery;
  assertAccess(delivery, actor);
  return delivery;
}

export async function getDeliveryByOrderId(salesOrderId: string, actor: AuthenticatedUser) {
  const snap = await collection().where("salesOrderId", "==", salesOrderId).limit(1).get();
  if (snap.empty) {
    throw new AppError(404, "No delivery exists for this order");
  }
  const doc = snap.docs[0]!;
  const delivery = { id: doc.id, ...doc.data() } as Delivery;
  assertAccess(delivery, actor);
  return delivery;
}

export async function listStatusHistory(id: string, actor: AuthenticatedUser) {
  await getDeliveryById(id, actor);
  const snap = await collection().doc(id).collection("statusHistory").orderBy("createdAt", "asc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function assignDriver(id: string, driverId: string, actor: AuthenticatedUser) {
  const ref = collection().doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(404, "Delivery not found");
  }
  const delivery = snap.data() as Delivery;
  if (delivery.status !== "unassigned") {
    throw new AppError(400, `Cannot assign a driver to a delivery that is already ${delivery.status}`);
  }

  await ref.update({ driverId, status: "assigned", assignedAt: FieldValue.serverTimestamp() });
  await db.collection("driverProfiles").doc(driverId).update({ status: "on_delivery" });
  await addStatusEvent(id, "assigned", null, actor.uid);

  await createNotification({
    userId: driverId,
    title: "New delivery assigned",
    message: `You've been assigned delivery for order ${delivery.orderNumber}.`,
    type: "delivery",
    relatedEntityId: id,
  });

  return { id };
}

export async function updateDeliveryStatus(
  id: string,
  input: UpdateDeliveryStatusInput,
  actor: AuthenticatedUser,
  proofOfDeliveryUrl?: string,
) {
  const ref = collection().doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(404, "Delivery not found");
  }
  const delivery = { id: snap.id, ...snap.data() } as Delivery;

  if (delivery.driverId !== actor.uid) {
    throw new AppError(403, "This delivery is not assigned to you");
  }
  const allowedNext = VALID_TRANSITIONS[delivery.status] ?? [];
  if (!allowedNext.includes(input.status)) {
    throw new AppError(400, `Cannot move delivery from ${delivery.status} to ${input.status}`);
  }

  const updates: Record<string, unknown> = { status: input.status };
  if (input.status === "picked_up") updates.pickedUpAt = FieldValue.serverTimestamp();
  if (input.status === "delivered") {
    updates.deliveredAt = FieldValue.serverTimestamp();
    if (proofOfDeliveryUrl) updates.proofOfDeliveryUrl = proofOfDeliveryUrl;
  }

  await ref.update(updates);
  if (input.status === "delivered" || input.status === "failed") {
    await db.collection("driverProfiles").doc(actor.uid).update({ status: "available" });
  }
  if (input.status === "delivered") {
    await markOrderCompleted(delivery.salesOrderId, actor);
  }
  await addStatusEvent(id, input.status, input.note ?? null, actor.uid);

  await createNotification({
    userId: delivery.customerId,
    title: "Delivery update",
    message: `Your order ${delivery.orderNumber} is now ${input.status.replace("_", " ")}.`,
    type: "delivery",
    relatedEntityId: id,
  });

  return { id, status: input.status };
}

export async function reportDeliveryIssue(
  deliveryId: string,
  input: ReportDeliveryIssueInput,
  actor: AuthenticatedUser,
) {
  const snap = await collection().doc(deliveryId).get();
  if (!snap.exists) {
    throw new AppError(404, "Delivery not found");
  }
  const delivery = { id: snap.id, ...snap.data() } as Delivery;
  if (delivery.customerId !== actor.uid) {
    throw new AppError(403, "This delivery does not belong to you");
  }

  const actorSnap = await db.collection("users").doc(actor.uid).get();
  const customerName = actorSnap.exists
    ? (actorSnap.data() as { displayName: string }).displayName
    : actor.email;

  const ref = issuesCollection().doc();
  await ref.set({
    deliveryId,
    salesOrderId: delivery.salesOrderId,
    orderNumber: delivery.orderNumber,
    customerId: actor.uid,
    customerName,
    description: input.description,
    status: "open",
    resolutionNote: null,
    resolvedBy: null,
    resolvedByName: null,
    createdAt: FieldValue.serverTimestamp(),
    resolvedAt: null,
  });

  await notifyRole(["admin", "manager"], {
    title: "Delivery issue reported",
    message: `${customerName} reported an issue with order ${delivery.orderNumber}: "${input.description}"`,
    type: "delivery",
    relatedEntityId: ref.id,
  });

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "DELIVERY_ISSUE_REPORTED",
    entityType: "deliveryIssue",
    entityId: ref.id,
    after: { deliveryId, description: input.description },
  });

  return { id: ref.id };
}

export async function listIssuesForDelivery(deliveryId: string, actor: AuthenticatedUser) {
  await getDeliveryById(deliveryId, actor);
  const snap = await issuesCollection().where("deliveryId", "==", deliveryId).get();
  const issues = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DeliveryIssue);
  return issues.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export async function listDeliveryIssues(filters: { status?: string }) {
  let query: FirebaseFirestore.Query = issuesCollection();
  if (filters.status) query = query.where("status", "==", filters.status);
  const snap = await query.get();
  const issues = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DeliveryIssue);
  return issues.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export async function resolveDeliveryIssue(
  id: string,
  input: ResolveDeliveryIssueInput,
  actor: AuthenticatedUser,
) {
  const ref = issuesCollection().doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(404, "Delivery issue not found");
  }
  const issue = snap.data() as DeliveryIssue;
  if (issue.status === "resolved") {
    throw new AppError(400, "This issue was already resolved");
  }

  const actorSnap = await db.collection("users").doc(actor.uid).get();
  const resolvedByName = actorSnap.exists
    ? (actorSnap.data() as { displayName: string }).displayName
    : actor.email;

  await ref.update({
    status: "resolved",
    resolutionNote: input.resolutionNote ?? null,
    resolvedBy: actor.uid,
    resolvedByName,
    resolvedAt: FieldValue.serverTimestamp(),
  });

  await createNotification({
    userId: issue.customerId,
    title: "Delivery issue resolved",
    message: `Your reported issue for order ${issue.orderNumber} has been resolved.${input.resolutionNote ? ` Note: ${input.resolutionNote}` : ""}`,
    type: "delivery",
    relatedEntityId: id,
  });

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "DELIVERY_ISSUE_RESOLVED",
    entityType: "deliveryIssue",
    entityId: id,
    after: { resolutionNote: input.resolutionNote ?? null },
  });

  return { id };
}

// The customer's own confirmation that they actually received the order,
// plus a 1-5 star rating — separate from the driver marking it "delivered".
// One-time only: can't be re-confirmed or re-rated through this endpoint.
export async function confirmDelivery(id: string, input: ConfirmDeliveryInput, actor: AuthenticatedUser) {
  const ref = collection().doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(404, "Delivery not found");
  }
  const delivery = { id: snap.id, ...snap.data() } as Delivery;

  if (delivery.customerId !== actor.uid) {
    throw new AppError(403, "This delivery does not belong to you");
  }
  if (delivery.status !== "delivered") {
    throw new AppError(400, "You can only confirm receipt once the delivery has been marked delivered");
  }
  if (delivery.customerConfirmedAt) {
    throw new AppError(400, "You've already confirmed this delivery");
  }

  await ref.update({
    customerConfirmedAt: FieldValue.serverTimestamp(),
    rating: input.rating,
  });

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "DELIVERY_CONFIRMED_BY_CUSTOMER",
    entityType: "delivery",
    entityId: id,
    after: { rating: input.rating },
  });

  return { id };
}
