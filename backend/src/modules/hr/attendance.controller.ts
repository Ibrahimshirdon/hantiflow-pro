import type { Request, Response } from "express";
import * as attendanceService from "./attendance.service.js";

export async function record(req: Request, res: Response) {
  const result = await attendanceService.recordAttendance(req.body, req.user!);
  res.status(201).json({ success: true, data: result });
}

export async function list(req: Request, res: Response) {
  // Staff can only ever see their own attendance — force the scope
  // server-side rather than trusting (or even reading) a client-supplied
  // staffId, same reasoning as the self-service path in recordAttendance.
  const isSelfService = req.user!.role === "staff";
  const records = await attendanceService.listAttendance({
    staffId: isSelfService ? req.user!.uid : (req.query.staffId as string | undefined),
    date: req.query.date as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  });
  res.json({ success: true, data: records });
}

export async function remove(req: Request, res: Response) {
  const result = await attendanceService.deleteAttendance(req.params.id as string);
  res.json({ success: true, data: result });
}
