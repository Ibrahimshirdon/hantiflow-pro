import { FieldValue } from "firebase-admin/firestore";
import { auth, db } from "../src/config/firebase.js";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const displayName = process.env.ADMIN_NAME ?? "System Admin";

if (!email || !password) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables before running this script.");
  process.exit(1);
}

const existing = await auth.getUserByEmail(email).catch(() => null);
if (existing) {
  console.log(`Admin already exists: ${existing.uid} (${email})`);
  process.exit(0);
}

const userRecord = await auth.createUser({ email, password, displayName });
await auth.setCustomUserClaims(userRecord.uid, { role: "admin" });

const batch = db.batch();
batch.set(db.collection("users").doc(userRecord.uid), {
  uid: userRecord.uid,
  email,
  displayName,
  phone: null,
  role: "admin",
  status: "active",
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
});
batch.set(db.collection("staffProfiles").doc(userRecord.uid), {
  uid: userRecord.uid,
  employeeId: "ADMIN-001",
  department: "Administration",
  assignedWarehouseId: null,
});
await batch.commit();

console.log(`Admin created: ${userRecord.uid} (${email})`);
process.exit(0);
