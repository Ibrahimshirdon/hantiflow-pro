import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase.js";
import { AppError } from "../../shared/utils/AppError.js";
import { uploadBuffer } from "../../shared/utils/uploadFile.js";
import type { AuthenticatedUser } from "../../shared/types/auth.types.js";
import type { FaceEnrollment } from "../../shared/types/hr.types.js";
import { recordSelfAttendance } from "./attendance.service.js";
import type { EnrollFaceInput } from "./faceAttendance.types.js";

const collection = () => db.collection("faceEnrollments");

// Standard face-api.js guidance: two descriptors under ~0.6 apart are
// almost always the same face. 0.5 is used here (a stricter cutoff) since
// a false match on an attendance kiosk marks the *wrong* person present,
// not just a minor inconvenience.
const MATCH_THRESHOLD = 0.5;

function euclideanDistance(a: number[], b: number[]) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i]! - b[i]!) ** 2;
  }
  return Math.sqrt(sum);
}

// Doc id == staffId, so re-enrolling (e.g. after a haircut throws off
// matches) simply overwrites the previous descriptor and photo. The photo
// itself plays no part in matching (that's purely the descriptor) — it
// exists solely so an admin reviewing the enrollment list can visually
// confirm whose face is on file, the same way product photos exist for
// human review rather than for any matching logic.
export async function enrollFace(
  input: EnrollFaceInput,
  photoBuffer: Buffer,
  actor: AuthenticatedUser,
) {
  const userSnap = await db.collection("users").doc(input.staffId).get();
  if (!userSnap.exists) {
    throw new AppError(404, "Staff member not found");
  }
  const user = userSnap.data() as { displayName: string };

  const photoUrl = await uploadBuffer(photoBuffer, {
    folder: "face-enrollments",
    resourceType: "image",
  });

  const ref = collection().doc(input.staffId);
  const existing = await ref.get();
  await ref.set({
    staffId: input.staffId,
    staffName: user.displayName,
    descriptor: input.descriptor,
    photoUrl,
    enrolledBy: actor.uid,
    createdAt: existing.exists ? existing.data()!.createdAt : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { staffId: input.staffId, photoUrl };
}

// Deliberately omits the descriptor field — the admin UI only needs to
// know *who* is enrolled and what they look like, never the raw biometric
// vector itself.
export async function listEnrollments() {
  const snap = await collection().get();
  return snap.docs
    .map((d) => {
      const data = d.data() as FaceEnrollment;
      return { staffId: data.staffId, staffName: data.staffName, photoUrl: data.photoUrl };
    })
    .sort((a, b) => a.staffName.localeCompare(b.staffName));
}

export async function deleteEnrollment(staffId: string) {
  const ref = collection().doc(staffId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(404, "Face enrollment not found");
  }
  await ref.delete();
  return { staffId };
}

// The caller never asserts *who* they are — the matched identity is
// determined entirely server-side from the closest enrolled descriptor,
// which is what makes this safe to expose on a shared kiosk device: a
// client can't just claim to be a given staffId, they have to actually
// match that staff member's enrolled face within MATCH_THRESHOLD.
export async function checkInByFace(descriptor: number[]) {
  const snap = await collection().get();

  let best: { staffId: string; staffName: string; distance: number } | null = null;
  for (const doc of snap.docs) {
    const data = doc.data() as FaceEnrollment;
    const distance = euclideanDistance(descriptor, data.descriptor);
    if (!best || distance < best.distance) {
      best = { staffId: data.staffId, staffName: data.staffName, distance };
    }
  }

  if (!best || best.distance > MATCH_THRESHOLD) {
    return { matched: false as const };
  }

  const result = await recordSelfAttendance(best.staffId, best.staffId, "face");
  return {
    matched: true as const,
    staffId: best.staffId,
    staffName: result.staffName,
    checkedOut: result.checkedOut,
  };
}
