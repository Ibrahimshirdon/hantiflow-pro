interface FirestoreTimestampLike {
  _seconds: number;
  _nanoseconds: number;
}

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
  dueDate: FirestoreTimestampLike;
  overdueNotifiedAt: FirestoreTimestampLike | null;
  createdAt: FirestoreTimestampLike;
  updatedAt: FirestoreTimestampLike;
}

export interface LoanRepayment {
  id: string;
  loanId: string;
  customerId: string;
  amount: number;
  method: "wallet" | "cash" | "card" | "mobile_money";
  recordedBy: string | null;
  recordedByName: string | null;
  createdAt: FirestoreTimestampLike;
}
