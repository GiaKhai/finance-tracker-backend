import express from "express";
import { authenticate } from "../middleware/auth.js";
import { uploadImage, upload } from "../controllers/uploadController.js";

const router = express.Router();

router.use(authenticate);

router.post("/image", upload.single("file"), uploadImage);

export default router;
