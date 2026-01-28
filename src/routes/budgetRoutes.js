import express from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
} from "../controllers/budgetController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getBudgets);

router.post(
  "/",
  [
    body("category_id").notEmpty().withMessage("Category is required"),
    body("amount").isFloat({ min: 0 }).withMessage("Amount must be positive"),
  ],
  createBudget
);

router.put(
    "/:id",
    [
      body("amount").optional().isFloat({ min: 0 }).withMessage("Amount must be positive"),
    ],
    updateBudget
  );

router.delete("/:id", deleteBudget);

export default router;
