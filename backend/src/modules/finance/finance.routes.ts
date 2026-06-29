import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { expenseRouter } from "./expense.routes.js";
import { incomeRouter } from "./income.routes.js";
import { reportsRouter } from "./reports.routes.js";

export const financeRouter = Router();

financeRouter.use(verifyToken);
financeRouter.use("/expenses", expenseRouter);
financeRouter.use("/income", incomeRouter);
financeRouter.use("/reports", reportsRouter);
