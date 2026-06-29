import type { Timestamp } from "firebase-admin/firestore";

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  paidTo: string | null;
  paymentMethod: string;
  date: Timestamp;
  recordedBy: string;
  attachmentUrl: string | null;
}

export interface OtherIncome {
  id: string;
  source: string;
  amount: number;
  date: Timestamp;
  recordedBy: string;
}
