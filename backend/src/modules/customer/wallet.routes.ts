import { Router } from "express";
import * as walletController from "./wallet.controller.js";

export const walletRouter = Router();

walletRouter.get("/", walletController.getMyWallet);
