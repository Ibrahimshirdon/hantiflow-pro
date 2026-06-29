import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { env } from "./env.js";

// File storage uses Cloudinary, not Firebase Storage, since Firebase Storage
// now requires the paid Blaze plan even for minimal usage. See config/cloudinary.ts.
const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: env.firebase.projectId,
      clientEmail: env.firebase.clientEmail,
      privateKey: env.firebase.privateKey,
    }),
  });

export const auth = getAuth(app);
export const db = getFirestore(app);
