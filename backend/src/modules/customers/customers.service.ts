import { FieldValue } from "firebase-admin/firestore";
import { auth, db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import { recordAuditLog } from "../../shared/utils/auditLog.js";
import { createNotification } from "../../shared/utils/notifications.js";
import type { AuthenticatedUser } from "../../shared/types/auth.types.js";
import type { CustomerProfile, UserDoc } from "../../shared/types/user.types.js";
import type {
  AdjustLoyaltyInput,
  AdjustWalletInput,
  SetCreditLimitInput,
  UpdateCustomerStatusInput,
} from "./customers.types.js";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function listCustomers() {
  const usersSnap = await db
    .collection("users")
    .where("role", "==", "customer")
    .orderBy("createdAt", "desc")
    .get();
  const users = usersSnap.docs.map((d) => d.data() as UserDoc);

  const profileSnaps = await Promise.all(
    users.map((u) => db.collection("customerProfiles").doc(u.uid).get()),
  );

  return users.map((user, i) => {
    const profile = profileSnaps[i]!.exists ? (profileSnaps[i]!.data() as CustomerProfile) : null;
    return {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      status: user.status,
      walletBalance: profile?.walletBalance ?? 0,
      loyaltyPoints: profile?.loyaltyPoints ?? 0,
      addressCount: profile?.addresses.length ?? 0,
      creditLimit: profile?.creditLimit ?? 0,
      outstandingLoanBalance: profile?.outstandingLoanBalance ?? 0,
      createdAt: user.createdAt,
    };
  });
}

// Bounds every action in this module to actual customer accounts only —
// admin/manager get wallet/loyalty/status power here scoped to customers
// specifically, deliberately not reusing the generic admin-only
// setUserStatus (which can target any role and stays admin-only there) to
// avoid accidentally widening manager's reach to staff/admin accounts.
async function assertCustomer(uid: string): Promise<UserDoc> {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) {
    throw new AppError(404, "Customer not found");
  }
  const user = snap.data() as UserDoc;
  if (user.role !== "customer") {
    throw new AppError(400, "This user is not a customer");
  }
  return user;
}

export async function setCustomerStatus(
  uid: string,
  input: UpdateCustomerStatusInput,
  actor: AuthenticatedUser,
) {
  const user = await assertCustomer(uid);

  await db.collection("users").doc(uid).update({
    status: input.status,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await auth.updateUser(uid, { disabled: input.status === "suspended" });

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "CUSTOMER_STATUS_CHANGED",
    entityType: "user",
    entityId: uid,
    before: { status: user.status },
    after: { status: input.status },
  });

  return { uid, status: input.status };
}

export async function adjustCustomerWallet(
  uid: string,
  input: AdjustWalletInput,
  actor: AuthenticatedUser,
) {
  await assertCustomer(uid);
  const profileRef = db.collection("customerProfiles").doc(uid);

  const actorSnap = await db.collection("users").doc(actor.uid).get();
  const performedByName = actorSnap.exists
    ? (actorSnap.data() as { displayName: string }).displayName
    : actor.email;

  // Admin/manager is now the only way money enters a customer's wallet
  // directly (customer self-service top-up was removed) — a credit here
  // is recorded as "top_up" so it reads correctly in the customer's own
  // transaction history; a debit is a correction, recorded as "adjustment".
  const reason = input.type === "credit" ? "top_up" : "adjustment";

  const newBalance = await db.runTransaction(async (tx) => {
    const snap = await tx.get(profileRef);
    if (!snap.exists) {
      throw new AppError(404, "Customer profile not found");
    }
    const profile = snap.data() as CustomerProfile;
    const delta = input.type === "credit" ? input.amount : -input.amount;
    const updatedBalance = round2(profile.walletBalance + delta);
    if (updatedBalance < 0) {
      throw new AppError(
        400,
        `Adjustment would make wallet balance negative (current: $${profile.walletBalance.toFixed(2)})`,
      );
    }

    tx.update(profileRef, { walletBalance: updatedBalance });
    tx.set(db.collection("walletTransactions").doc(), {
      customerId: uid,
      type: input.type,
      amount: input.amount,
      reason,
      relatedOrderId: null,
      balanceAfter: updatedBalance,
      performedBy: actor.uid,
      performedByName,
      createdAt: FieldValue.serverTimestamp(),
    });
    return updatedBalance;
  });

  await createNotification({
    userId: uid,
    title: input.type === "credit" ? "Wallet topped up" : "Wallet adjusted",
    message: `Your wallet was ${input.type === "credit" ? "topped up" : "debited"} $${input.amount.toFixed(2)} by ${performedByName}. New balance: $${newBalance.toFixed(2)}.`,
    type: "wallet",
  });

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "CUSTOMER_WALLET_ADJUSTED",
    entityType: "user",
    entityId: uid,
    after: { type: input.type, amount: input.amount, reason: input.reason, newBalance },
  });

  return { walletBalance: newBalance };
}

export async function adjustCustomerLoyaltyPoints(
  uid: string,
  input: AdjustLoyaltyInput,
  actor: AuthenticatedUser,
) {
  await assertCustomer(uid);
  const profileRef = db.collection("customerProfiles").doc(uid);

  const newPoints = await db.runTransaction(async (tx) => {
    const snap = await tx.get(profileRef);
    if (!snap.exists) {
      throw new AppError(404, "Customer profile not found");
    }
    const profile = snap.data() as CustomerProfile;
    const updated = profile.loyaltyPoints + input.pointsChange;
    if (updated < 0) {
      throw new AppError(
        400,
        `Adjustment would make loyalty points negative (current: ${profile.loyaltyPoints})`,
      );
    }
    tx.update(profileRef, { loyaltyPoints: updated });
    return updated;
  });

  await createNotification({
    userId: uid,
    title: "Loyalty points adjusted",
    message: `Your loyalty points were ${input.pointsChange > 0 ? "increased" : "decreased"} by ${Math.abs(input.pointsChange)}. New total: ${newPoints}.`,
    type: "system",
  });

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "CUSTOMER_LOYALTY_ADJUSTED",
    entityType: "user",
    entityId: uid,
    after: { pointsChange: input.pointsChange, reason: input.reason, newPoints },
  });

  return { loyaltyPoints: newPoints };
}

export async function setCustomerCreditLimit(
  uid: string,
  input: SetCreditLimitInput,
  actor: AuthenticatedUser,
) {
  await assertCustomer(uid);
  const profileRef = db.collection("customerProfiles").doc(uid);

  const snap = await profileRef.get();
  if (!snap.exists) {
    throw new AppError(404, "Customer profile not found");
  }
  const profile = snap.data() as CustomerProfile;
  const previousLimit = profile.creditLimit ?? 0;

  await profileRef.update({ creditLimit: input.creditLimit });

  await createNotification({
    userId: uid,
    title: "Credit limit updated",
    message: `Your loan credit limit is now $${input.creditLimit.toFixed(2)}.`,
    type: "system",
  });

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "CUSTOMER_CREDIT_LIMIT_SET",
    entityType: "user",
    entityId: uid,
    before: { creditLimit: previousLimit },
    after: { creditLimit: input.creditLimit },
  });

  return { creditLimit: input.creditLimit };
}
