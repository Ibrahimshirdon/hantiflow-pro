import { Router } from "express";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { recordAttendanceSchema } from "./attendance.types.js";
import * as attendanceController from "./attendance.controller.js";

export const attendanceRouter = Router();

// Staff are allowed on list/record too — they're scoped server-side to only
// their own attendance (see attendance.controller.ts / attendance.service.ts)
// so they can self check-in/out, but delete stays admin-only: staff
// shouldn't be able to erase their own attendance history.
attendanceRouter.get("/", requireRole(["admin", "manager", "staff"]), attendanceController.list);
attendanceRouter.post(
  "/",
  requireRole(["admin", "manager", "staff"]),
  validate(recordAttendanceSchema),
  attendanceController.record,
);
attendanceRouter.delete("/:id", requireRole(["admin"]), attendanceController.remove);
