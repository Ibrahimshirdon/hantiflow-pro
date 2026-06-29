import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import { recordAuditLog } from "../../shared/utils/auditLog.js";
import { createNotification } from "../../shared/utils/notifications.js";
import type { AuthenticatedUser } from "../../shared/types/auth.types.js";
import type { CustomerProfile } from "../../shared/types/user.types.js";
import type { Loan, LoanRepayment } from "../../shared/types/loan.types.js";
import type {
  RecordRepaymentInput,
  RepayFromWalletInput,
  SetLoanDueDateInput,
} from "./loan.types.js";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const collection = () => db.collection("loans");
const repaymentsCollection = () => db.collection("loanRepayments");

// There's no background job runner in this app — instead, every time loans
// are listed (admin viewing the Loans page, or a customer viewing their own
// on their dashboard), any outstanding loan whose dueDate has passed gets a
// one-time reminder sent here. overdueNotifiedAt makes this idempotent, so
// it's safe to call on every list regardless of who's asking or how often.
async function notifyOverdueLoans(loans: Loan[]) {
  const now = Date.now();
  // dueDate/overdueNotifiedAt didn't exist on loans created before this
  // check was added — guard against those older docs rather than crashing
  // the whole listLoans() call (and therefore the entire GET /loans
  // request) on a missing field.
  const overdue = loans.filter(
    (l) => l.status === "outstanding" && !l.overdueNotifiedAt && l.dueDate && l.dueDate.toMillis() < now,
  );
  if (overdue.length === 0) return;

  await Promise.all(
    overdue.map(async (loan) => {
      await createNotification({
        userId: loan.customerId,
        title: "Loan payment overdue",
        message: `Your loan for order ${loan.orderNumber} ($${loan.balanceRemaining.toFixed(2)} remaining) was due on ${loan.dueDate.toDate().toLocaleDateString()}. Please arrange repayment.`,
        type: "wallet",
        relatedEntityId: loan.id,
      });
      await collection().doc(loan.id).update({ overdueNotifiedAt: FieldValue.serverTimestamp() });
      loan.overdueNotifiedAt = loan.dueDate; // best-effort local mark so the same response doesn't re-notify
    }),
  );
}

export async function listLoans(filters: { customerId?: string; status?: string }) {
  let query: FirebaseFirestore.Query = collection();
  if (filters.customerId) query = query.where("customerId", "==", filters.customerId);
  if (filters.status) query = query.where("status", "==", filters.status);
  const snap = await query.get();
  const loans = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Loan);
  await notifyOverdueLoans(loans);
  return loans.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export async function listRepayments(filters: { loanId?: string; customerId?: string }) {
  let query: FirebaseFirestore.Query = repaymentsCollection();
  if (filters.loanId) query = query.where("loanId", "==", filters.loanId);
  if (filters.customerId) query = query.where("customerId", "==", filters.customerId);
  const snap = await query.get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as LoanRepayment)
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

// Admin/manager recording a repayment on the customer's behalf — usually
// cash/card/mobile money paid in person, but "wallet" is also allowed here
// (the staff member deducting it from the customer's wallet for them,
// distinct from repayLoanFromWallet below which is the customer doing it
// themselves through their own portal). Either way, choosing "wallet" here
// still has to actually debit the customer's real wallet balance, not just
// log the label.
export async function recordRepayment(loanId: string, input: RecordRepaymentInput, actor: AuthenticatedUser) {
  const loanRef = collection().doc(loanId);

  const actorSnap = await db.collection("users").doc(actor.uid).get();
  const recordedByName = actorSnap.exists
    ? (actorSnap.data() as { displayName: string }).displayName
    : actor.email;

  const result = await db.runTransaction(async (tx) => {
    // ---------- READ PHASE ----------
    const loanSnap = await tx.get(loanRef);
    if (!loanSnap.exists) {
      throw new AppError(404, "Loan not found");
    }
    const loan = loanSnap.data() as Loan;

    const profileRef = db.collection("customerProfiles").doc(loan.customerId);
    const profileSnap = await tx.get(profileRef);

    if (loan.status === "paid_off") {
      throw new AppError(400, "This loan is already paid off");
    }
    if (input.amount > loan.balanceRemaining) {
      throw new AppError(
        400,
        `Repayment of $${input.amount.toFixed(2)} exceeds remaining balance of $${loan.balanceRemaining.toFixed(2)}`,
      );
    }
    const profile = profileSnap.exists ? (profileSnap.data() as CustomerProfile) : null;
    if (input.method === "wallet" && (!profile || profile.walletBalance < input.amount)) {
      throw new AppError(400, "Customer's wallet balance is insufficient for this repayment");
    }

    // ---------- COMPUTE PHASE ----------
    const newAmountRepaid = round2(loan.amountRepaid + input.amount);
    const newBalanceRemaining = round2(loan.balanceRemaining - input.amount);
    const newStatus = newBalanceRemaining <= 0 ? ("paid_off" as const) : ("outstanding" as const);
    const newWalletBalance =
      input.method === "wallet" && profile ? round2(profile.walletBalance - input.amount) : null;

    // ---------- WRITE PHASE ----------
    tx.update(loanRef, {
      amountRepaid: newAmountRepaid,
      balanceRemaining: newBalanceRemaining,
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (profile) {
      const profileUpdates: Record<string, number> = {
        outstandingLoanBalance: round2(Math.max(0, (profile.outstandingLoanBalance ?? 0) - input.amount)),
      };
      if (newWalletBalance !== null) {
        profileUpdates.walletBalance = newWalletBalance;
      }
      tx.update(profileRef, profileUpdates);
    }

    if (newWalletBalance !== null) {
      tx.set(db.collection("walletTransactions").doc(), {
        customerId: loan.customerId,
        type: "debit",
        amount: input.amount,
        reason: "loan_repayment",
        relatedOrderId: loan.salesOrderId,
        balanceAfter: newWalletBalance,
        performedBy: actor.uid,
        performedByName: recordedByName,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    tx.set(repaymentsCollection().doc(), {
      loanId,
      customerId: loan.customerId,
      amount: input.amount,
      method: input.method,
      recordedBy: actor.uid,
      recordedByName,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { loan, newBalanceRemaining, newStatus };
  });

  await createNotification({
    userId: result.loan.customerId,
    title: "Loan repayment recorded",
    message: `A repayment of $${input.amount.toFixed(2)} was recorded against your loan for order ${result.loan.orderNumber} by ${recordedByName}. Remaining balance: $${result.newBalanceRemaining.toFixed(2)}.`,
    type: "wallet",
    relatedEntityId: loanId,
  });

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "LOAN_REPAYMENT_RECORDED",
    entityType: "loan",
    entityId: loanId,
    after: { amount: input.amount, method: input.method, newBalanceRemaining: result.newBalanceRemaining },
  });

  return { id: loanId, balanceRemaining: result.newBalanceRemaining, status: result.newStatus };
}

// Customer's own self-service repayment, paid straight out of their wallet
// balance — both debits must succeed/fail together, so this is one
// transaction rather than reusing recordRepayment's separate one.
export async function repayLoanFromWallet(
  loanId: string,
  input: RepayFromWalletInput,
  actor: AuthenticatedUser,
) {
  const loanRef = collection().doc(loanId);
  const profileRef = db.collection("customerProfiles").doc(actor.uid);

  const result = await db.runTransaction(async (tx) => {
    // ---------- READ PHASE ----------
    const loanSnap = await tx.get(loanRef);
    if (!loanSnap.exists) {
      throw new AppError(404, "Loan not found");
    }
    const loan = loanSnap.data() as Loan;
    if (loan.customerId !== actor.uid) {
      throw new AppError(403, "This loan does not belong to you");
    }
    if (loan.status === "paid_off") {
      throw new AppError(400, "This loan is already paid off");
    }
    if (input.amount > loan.balanceRemaining) {
      throw new AppError(
        400,
        `Repayment of $${input.amount.toFixed(2)} exceeds remaining balance of $${loan.balanceRemaining.toFixed(2)}`,
      );
    }

    const profileSnap = await tx.get(profileRef);
    if (!profileSnap.exists) {
      throw new AppError(404, "Customer profile not found");
    }
    const profile = profileSnap.data() as CustomerProfile;
    if (profile.walletBalance < input.amount) {
      throw new AppError(400, "Insufficient wallet balance");
    }

    // ---------- COMPUTE PHASE ----------
    const newWalletBalance = round2(profile.walletBalance - input.amount);
    const newAmountRepaid = round2(loan.amountRepaid + input.amount);
    const newBalanceRemaining = round2(loan.balanceRemaining - input.amount);
    const newStatus = newBalanceRemaining <= 0 ? ("paid_off" as const) : ("outstanding" as const);
    const newOutstandingLoanBalance = round2(
      Math.max(0, (profile.outstandingLoanBalance ?? 0) - input.amount),
    );

    // ---------- WRITE PHASE ----------
    tx.update(profileRef, {
      walletBalance: newWalletBalance,
      outstandingLoanBalance: newOutstandingLoanBalance,
    });
    tx.update(loanRef, {
      amountRepaid: newAmountRepaid,
      balanceRemaining: newBalanceRemaining,
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.collection("walletTransactions").doc(), {
      customerId: actor.uid,
      type: "debit",
      amount: input.amount,
      reason: "loan_repayment",
      relatedOrderId: loan.salesOrderId,
      balanceAfter: newWalletBalance,
      performedBy: null,
      performedByName: null,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(repaymentsCollection().doc(), {
      loanId,
      customerId: actor.uid,
      amount: input.amount,
      method: "wallet",
      recordedBy: null,
      recordedByName: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { newBalanceRemaining, newStatus, newWalletBalance, orderNumber: loan.orderNumber };
  });

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "LOAN_REPAID_FROM_WALLET",
    entityType: "loan",
    entityId: loanId,
    after: { amount: input.amount, newBalanceRemaining: result.newBalanceRemaining },
  });

  return {
    id: loanId,
    balanceRemaining: result.newBalanceRemaining,
    status: result.newStatus,
    walletBalance: result.newWalletBalance,
  };
}

// Admin-only override of a loan's due date — e.g. extending it for a
// customer who asked for more time. Resets overdueNotifiedAt so a loan
// that was already flagged overdue can trigger a fresh reminder if the
// new due date also eventually passes, rather than staying silently
// suppressed by the old notification flag forever.
export async function setLoanDueDate(loanId: string, input: SetLoanDueDateInput, actor: AuthenticatedUser) {
  const loanRef = collection().doc(loanId);
  const snap = await loanRef.get();
  if (!snap.exists) {
    throw new AppError(404, "Loan not found");
  }
  const loan = snap.data() as Loan;

  await loanRef.update({
    dueDate: input.dueDate,
    overdueNotifiedAt: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await createNotification({
    userId: loan.customerId,
    title: "Loan due date updated",
    message: `Your loan for order ${loan.orderNumber} now has a new due date: ${input.dueDate.toLocaleDateString()}.`,
    type: "wallet",
    relatedEntityId: loanId,
  });

  await recordAuditLog({
    userId: actor.uid,
    userName: actor.email,
    role: actor.role,
    action: "LOAN_DUE_DATE_SET",
    entityType: "loan",
    entityId: loanId,
    before: { dueDate: loan.dueDate ?? null },
    after: { dueDate: input.dueDate },
  });

  return { id: loanId, dueDate: input.dueDate };
}
