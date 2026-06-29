import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { requireRole } from "../../middleware/requireRole.js";
import { walletRouter } from "./wallet.routes.js";
import { customerOrderRouter } from "./customerOrder.routes.js";

export const customerRouter = Router();

// verifyToken must run before requireRole so req.user is populated by the
// time the role check happens; the sub-routers below no longer need their
// own verifyToken since this parent router already guarantees it ran.
// Notifications are NOT mounted here - they're generic to every role, not
// customer-specific, so they're mounted separately in app.ts.
customerRouter.use(verifyToken, requireRole(["customer"]));
customerRouter.use("/wallet", walletRouter);
customerRouter.use("/", customerOrderRouter);
