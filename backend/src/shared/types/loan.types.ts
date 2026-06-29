import type { Timestamp } from "firebase-admin/firestore";

export interface Loan {
  id: string;
  customerId: string;
  customerName: string;
  salesOrderId: string;
  orderNumber: string;
  principalAmount: number;
  amountRepaid: number;
  balanceRemaining: number;
  status: "outstanding" | "paid_off";
  // 30 days from creation, fixed at the time the loan is issued — not
  // recalculated on partial repayment.
  dueDate: Timestamp;
  // Set once an overdue reminder has actually been sent, so the lazy
  // check in listLoans() never sends a second one for the same loan.
  overdueNotifiedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LoanRepayment {
  id: string;
  loanId: string;
  customerId: string;
  amount: number;
  method: "wallet" | "cash" | "card" | "mobile_money";
  // null when the customer repaid themselves from their own wallet —
  // there's no human "performer" for that, same convention as
  // WalletTransaction.performedBy for a system-driven purchase debit.
  recordedBy: string | null;
  recordedByName: string | null;
  createdAt: Timestamp;
}
