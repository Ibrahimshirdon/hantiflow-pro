import { db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import type { CustomerProfile, WalletTransaction } from "../../shared/types/user.types.js";

export async function getWallet(customerId: string) {
  const profileSnap = await db.collection("customerProfiles").doc(customerId).get();
  if (!profileSnap.exists) {
    throw new AppError(404, "Customer profile not found");
  }
  const profile = profileSnap.data() as CustomerProfile;

  const txSnap = await db
    .collection("walletTransactions")
    .where("customerId", "==", customerId)
    .get();
  const transactions = txSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as WalletTransaction)
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

  return { walletBalance: profile.walletBalance, transactions };
}
