import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { supplierCompanyRouter } from "./supplierCompany.routes.js";
import { supplierProductRouter } from "./supplierProduct.routes.js";
import { stockRequestRouter } from "./stockRequest.routes.js";
import { supplierSubmissionRouter } from "./supplierSubmission.routes.js";

export const supplierRouter = Router();

supplierRouter.use(verifyToken);
supplierRouter.use("/companies", supplierCompanyRouter);
supplierRouter.use("/products", supplierProductRouter);
supplierRouter.use("/stock-requests", stockRequestRouter);
supplierRouter.use("/submissions", supplierSubmissionRouter);
