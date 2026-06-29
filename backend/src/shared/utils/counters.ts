import type { Transaction } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";

interface Counter {
  name: string;
  lastValue: number;
}

// Firestore transactions cannot perform a read after any write has been
// issued, so reading and writing a sequence counter must be separate calls
// that the caller orders correctly (read every counter first, write all of
// them - and everything else - afterward).

export function counterRef(name: string) {
  return db.collection("counters").doc(name);
}

export async function readCounterValue(tx: Transaction, name: string): Promise<number> {
  const snap = await tx.get(counterRef(name));
  return snap.exists ? (snap.data() as Counter).lastValue : 0;
}

export function formatSequence(value: number, prefix: string, padding = 5): string {
  return `${prefix}-${String(value).padStart(padding, "0")}`;
}
