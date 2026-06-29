import type { NextFunction, Request, Response } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Generic, systemic activity tracking: every successful mutating request by
// an authenticated user gets logged automatically, rather than hand-adding
// a log call inside every individual service function. Registered before
// routing in app.ts; req.user is populated by the time `finish` fires
// (after whichever route's own verifyToken ran), regardless of where this
// middleware sits in the chain, since it only attaches a listener here.
export function activityTracker(req: Request, res: Response, next: NextFunction) {
  // Captured eagerly, before any nested router strips its mount prefix off
  // req.path/req.url. req.originalUrl is left alone by Express as requests
  // traverse nested routers, but capturing it now (rather than reading it
  // lazily inside the `finish` callback) is the safer, more obviously
  // correct choice.
  const method = req.method;
  const path = req.originalUrl.split("?")[0];

  res.on("finish", () => {
    if (!req.user) return;
    if (!MUTATING_METHODS.has(method)) return;
    if (res.statusCode >= 400) return;

    db.collection("activityLogs")
      .add({
        userId: req.user.uid,
        action: `${method} ${path}`,
        metadata: { statusCode: res.statusCode },
        createdAt: FieldValue.serverTimestamp(),
      })
      .catch((err) => console.error("Failed to record activity log", err));
  });
  next();
}
