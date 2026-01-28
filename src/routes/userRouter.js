import express from "express";
import { body } from "express-validator";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateProfile,
  updatePassword,
} from "../controllers/userController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getUsers);
router.put("/profile/update", updateProfile);
router.put("/profile/change-password", updatePassword);
router.get("/:id", getUserById);

router.post(
  "/",
  [
    body("name").notEmpty().withMessage("User name is required"),
    body("role")
      .isIn(["user", "admin"])
      .withMessage("Role must be user or admin"),
    body("icon").optional().isString(),
  ],
  createUser
);

router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
