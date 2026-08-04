import type { Request, Response } from "express";
import * as faceAttendanceService from "./faceAttendance.service.js";

export async function enroll(req: Request, res: Response) {
  const result = await faceAttendanceService.enrollFace(req.body, req.user!);
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
