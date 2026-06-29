interface FirestoreTimestampLike {
  _seconds: number;
  _nanoseconds: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "order" | "delivery" | "stock" | "system" | "wallet";
  isRead: boolean;
  relatedEntityId: string | null;
  createdAt: FirestoreTimestampLike;
}

export interface WalletTransaction {
  id: string;
  customerId: string;
  type: "credit" | "debit";
  amount: number;
  reason: "top_up" | "purchase" | "refund" | "adjustment" | "loan_repayment";
  relatedOrderId: string | null;
  balanceAfter: number;
  performedBy: string | null;
  performedByName: string | null;
  createdAt: FirestoreTimestampLike;
}

export interface Wallet {
  walletBalance: number;
  transactions: WalletTransaction[];
}

export interface CustomerSummary {
  uid: string;
  displayName: string;
  email: string;
  phone: string | null;
  status: "active" | "suspended";
  walletBalance: number;
  loyaltyPoints: number;
  addressCount: number;
  creditLimit: number;
  outstandingLoanBalance: number;
  createdAt: FirestoreTimestampLike;
}
