import type { Request, Response } from "express";
import { AppError } from "../../shared/utils/AppError.js";
import { enrollFaceSchema } from "./faceAttendance.types.js";
import * as faceAttendanceService from "./faceAttendance.service.js";

// multipart/form-data (not JSON, since a photo file rides alongside it), so
// this bypasses the usual `validate()` middleware — multer puts every
// non-file field on req.body as a plain string, including `descriptor`,
// which arrives JSON-stringified from the client and needs parsing before
// it can be checked against the schema.
export async function enroll(req: Request, res: Response) {
  if (!req.file) {
    throw new AppError(400, "No face photo provided");
  }

  let descriptor: unknown;
  try {
    descriptor = JSON.parse(req.body.descriptor);
  } catch {
    throw new AppError(400, "Invalid descriptor payload");
  }

  const parsed = enrollFaceSchema.safeParse({ staffId: req.body.staffId, descriptor });
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message ?? "Invalid request body");
  }

  const result = await faceAttendanceService.enrollFace(parsed.data, req.file.buffer, req.user!);
  res.status(201).json({ success: true, data: result });
}

export async function list(_req: Request, res: Response) {
  const enrollments = await faceAttendanceService.listEnrollments();
  res.json({ success: true, data: enrollments });
}

export async function remove(req: Request, res: Response) {
  const result = await faceAttendanceService.deleteEnrollment(req.params.staffId as string);
  res.json({ success: true, data: result });
}

export async function checkIn(req: Request, res: Response) {
  const result = await faceAttendanceService.checkInByFace(req.body.descriptor);
  res.json({ success: true, data: result });
}
