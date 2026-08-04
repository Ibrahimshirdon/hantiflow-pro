import { z } from "zod";

// face-api.js's recognition net always outputs a 128-length embedding —
// enforcing the exact length here rejects garbage payloads before they
// ever reach a Euclidean-distance comparison.
const descriptorSchema = z.array(z.number()).length(128);

export const enrollFaceSchema = z.object({
  staffId: z.string().min(1),
  descriptor: descriptorSchema,
});
export type EnrollFaceInput = z.infer<typeof enrollFaceSchema>;

export const faceCheckInSchema = z.object({
  descriptor: descriptorSchema,
});
export type FaceCheckInInput = z.infer<typeof faceCheckInSchema>;
