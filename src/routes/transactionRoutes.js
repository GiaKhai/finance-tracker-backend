import express from "express";
import { body } from "express-validator";
import {
  getTransactions,
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "../controllers/transactionController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getTransactions);
router.get("/all", getAllTransactions);
router.get("/:id", getTransactionById);

router.post(
  "/",
  [
    body("wallet_id").isInt().withMessage("Invalid Wallet ID"),
    body("amount")
      .isFloat({ gt: 0 })
      .withMessage("Amount must be greater than 0"),
    body("type")
      .isIn(["income", "expense", "INCOME", "EXPENSE"])
      .withMessage("Type must be income or expense"),
    body("category").optional(),
    body("description").optional(),
    body("date").isDate().withMessage("Invalid date"),
  ],
  createTransaction
);

router.put("/:id", updateTransaction);
router.delete("/:id", deleteTransaction);

export default router;
