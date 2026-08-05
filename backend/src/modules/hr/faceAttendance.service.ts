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

function findClosestMatch(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
  descriptor: number[],
): { staffId: string; staffName: string; distance: number } | null {
  let best: { staffId: string; staffName: string; distance: number } | null = null;
  for (const doc of docs) {
    const data = doc.data() as FaceEnrollment;
    const distance = euclideanDistance(descriptor, data.descriptor);
    if (!best || distance < best.distance) {
      best = { staffId: data.staffId, staffName: data.staffName, distance };
    }
  }
  return best;
}

// Doc id == staffId, so re-enrolling yourself (e.g. after a haircut throws
// off matches) simply overwrites your own previous descriptor and photo.
// The photo itself plays no part in matching (that's purely the
// descriptor) — it exists solely so an admin reviewing the enrollment list
// can visually confirm whose face is on file, the same way product photos
// exist for human review rather than for any matching logic.
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

  // One-face-one-account boundary: reject the enrollment if this face is
  // already on file under a *different* staff member, before it ever
  // touches Cloudinary or Firestore. Without this, the same person could
  // be enrolled under two accounts and clock in as either — or two
  // employees could share one enrollment by mistake — either of which
  // defeats the point of using a face as an identity check at all.
  const snap = await collection().get();
  const otherDocs = snap.docs.filter((doc) => doc.id !== input.staffId);
  const closest = findClosestMatch(otherDocs, input.descriptor);
  if (closest && closest.distance <= MATCH_THRESHOLD) {
    throw new AppError(
      409,
      `This face is already enrolled for ${closest.staffName}. Each face can only be enrolled once.`,
    );
  }

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

// Scoped to the logged-in caller's own enrollment only — this is *not* a
// walk-up-anyone kiosk. It deliberately does not search across every
// enrolled face and pick whichever is closest, because that would let
// whoever's session happens to be open check in as anyone whose face is
// in frame (e.g. Bishaar's browser session checking in Ibrahim just
// because Ibrahim's face was pointed at the camera). Instead the scan is
// checked against *only* the authenticated user's own descriptor: it
// either matches Cali's own enrolled face closely enough, or it's denied
// — even if it happens to match a different real person's enrollment.
export async function checkInByFace(descriptor: number[], actor: AuthenticatedUser) {
  const ref = collection().doc(actor.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    return { matched: false as const, reason: "not_enrolled" as const };
  }

  const data = snap.data() as FaceEnrollment;
  const distance = euclideanDistance(descriptor, data.descriptor);
  if (distance > MATCH_THRESHOLD) {
    return { matched: false as const, reason: "no_match" as const };
  }

  const result = await recordSelfAttendance(actor.uid, actor.uid, "face");
  return {
    matched: true as const,
    staffId: actor.uid,
    staffName: result.staffName,
    checkedOut: result.checkedOut,
  };
}
