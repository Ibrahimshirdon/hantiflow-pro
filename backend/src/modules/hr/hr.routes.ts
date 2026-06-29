import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { salaryRouter } from "./salary.routes.js";
import { attendanceRouter } from "./attendance.routes.js";

export const hrRouter = Router();

hrRouter.use(verifyToken);
hrRouter.use("/salaries", salaryRouter);
hrRouter.use("/attendance", attendanceRouter);
