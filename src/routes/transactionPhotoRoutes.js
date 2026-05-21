import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  uploadPhoto,
  getPhotosByDate,
  getPhotos,
  deletePhoto,
} from "../controllers/transactionPhotoController.js";

const router = express.Router();

router.use(authenticate);

// Save photo URL to DB (after uploading image separately)
router.post("/upload", uploadPhoto);

// Get photos grouped by date (for calendar)
router.get("/photos/calendar", getPhotosByDate);

// Get all photos with pagination
router.get("/photos", getPhotos);

// Delete photo
router.delete("/photos/:id", deletePhoto);

export default router;
