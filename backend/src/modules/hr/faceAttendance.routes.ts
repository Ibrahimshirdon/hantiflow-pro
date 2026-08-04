import { Router } from "express";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { enrollFaceSchema, faceCheckInSchema } from "./faceAttendance.types.js";
import * as faceAttendanceController from "./faceAttendance.controller.js";

export const faceAttendanceRouter = Router();

faceAttendanceRouter.get("/", requireRole(["admin", "manager"]), faceAttendanceController.list);
faceAttendanceRouter.post(
  "/enroll",
  requireRole(["admin", "manager"]),
  validate(enrollFaceSchema),
  faceAttendanceController.enroll,
);
faceAttendanceRouter.delete(
  "/:staffId",
  requireRole(["admin", "manager"]),
  faceAttendanceController.remove,
);
// Open to staff too — this is the endpoint the shared kiosk device calls,
// and the kiosk itself is logged in as whichever staff-side account is on
// duty at that station, not the person being checked in.
faceAttendanceRouter.post(
  "/checkin",
  requireRole(["admin", "manager", "staff"]),
  validate(faceCheckInSchema),
  faceAttendanceController.checkIn,
);
