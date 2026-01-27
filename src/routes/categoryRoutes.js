import express from "express";
import { body } from "express-validator";
import {
  getCategories,
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getCategories);
router.get("/all", getAllCategories);
router.get("/:id", getCategoryById);

router.post(
  "/",
  [
    body("name").notEmpty().withMessage("Category name is required"),
    body("type")
      .isIn(["INCOME", "EXPENSE"])
      .withMessage("Type must be INCOME or EXPENSE"),
    body("icon").optional().isString(),
  ],
  createCategory
);

router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;
