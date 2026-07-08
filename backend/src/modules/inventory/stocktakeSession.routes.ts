import { Router } from "express";
import { verifyToken } from "../../middleware/verifyToken.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validate } from "../../middleware/validate.js";
import { createStocktakeSessionSchema, commitStocktakeSessionSchema } from "./stocktakeSession.types.js";
import * as stocktakeController from "./stocktakeSession.controller.js";

export const stocktakeRouter = Router();

stocktakeRouter.use(verifyToken, requireRole(["admin", "manager"]));
stocktakeRouter.get("/", stocktakeController.listSessions);
stocktakeRouter.post("/", validate(createStocktakeSessionSchema), stocktakeController.createSession);
stocktakeRouter.get("/:id", stocktakeController.getSession);
stocktakeRouter.post("/:id/commit", validate(commitStocktakeSessionSchema), stocktakeController.commitSession);
