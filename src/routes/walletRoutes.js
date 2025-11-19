import express from "express";
import { body } from "express-validator";
import {
  getWallets,
  getWalletById,
  createWallet,
  updateWallet,
  deleteWallet,
} from "../controllers/walletController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getWallets);
router.get("/:id", getWalletById);

router.post(
  "/",
  [
    body("name").notEmpty().withMessage("Wallet name is required"),
    body("balance").optional().isNumeric(),
    body("currency").optional().isString(),
  ],
  createWallet
);

router.put("/:id", updateWallet);
router.delete("/:id", deleteWallet);

export default router;
