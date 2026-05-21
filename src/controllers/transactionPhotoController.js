import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../config/database.js";
import cloudinary from "../config/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter,
});

// Helper to check admin role
const isUserAdmin = async (req) => {
  if (req.userRole === "admin") return true;
  const [users] = await pool.query("SELECT role FROM users WHERE id = ?", [req.userId]);
  return users[0]?.role === "admin";
};

export const uploadPhoto = async (req, res, next) => {
  try {
    const { photo_url, transaction_id, date, note } = req.body;
    const photoDate = date || new Date().toISOString().split("T")[0];

    if (!photo_url) {
      return res.status(400).json({ message: "No photo URL provided" });
    }

    const [dbResult] = await pool.query(
      "INSERT INTO transaction_photos (user_id, transaction_id, photo_url, photo_date, note) VALUES (?, ?, ?, ?, ?)",
      [req.userId, transaction_id || null, photo_url, photoDate, note || null]
    );

    res.status(201).json({
      message: "Photo saved successfully",
      photo: {
        id: dbResult.insertId,
        user_id: req.userId,
        transaction_id: transaction_id || null,
        photo_url: photo_url,
        photo_date: photoDate,
        note: note || null,
        created_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPhotosByDate = async (req, res, next) => {
  try {
    const { start_date, end_date, transaction_id } = req.query;
    const isAdmin = await isUserAdmin(req);

    let query = `
      SELECT tp.id,
             tp.user_id,
             tp.transaction_id,
             tp.photo_url,
             DATE_FORMAT(tp.photo_date, '%Y-%m-%d') as photo_date,
             tp.note,
             tp.created_at,
             t.amount as transaction_amount,
             t.type as transaction_type,
             c.name as category_name,
             w.name as wallet_name
      FROM transaction_photos tp
      LEFT JOIN transactions t ON tp.transaction_id = t.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN wallets w ON t.wallet_id = w.id
      WHERE 1=1
    `;
    const params = [];

    if (!isAdmin) {
      query += " AND tp.user_id = ?";
      params.push(req.userId);
    }

    if (start_date) {
      query += " AND tp.photo_date >= ?";
      params.push(start_date);
    }

    if (end_date) {
      query += " AND tp.photo_date <= ?";
      params.push(end_date);
    }

    if (transaction_id) {
      query += " AND tp.transaction_id = ?";
      params.push(transaction_id);
    }

    query += " ORDER BY tp.photo_date DESC, tp.created_at DESC";

    const [photos] = await pool.query(query, params);

    // Group photos by date
    const groupedByDate = {};
    photos.forEach((photo) => {
      // photo_date is already a DATE column (YYYY-MM-DD), use it directly
      // Only normalize if it contains time portion
      let date = photo.photo_date;
      if (date && date.includes("T")) {
        date = date.split("T")[0];
      }
      if (!groupedByDate[date]) {
        groupedByDate[date] = {
          date,
          photos: [],
          totalIncome: 0,
          totalExpense: 0,
          transactions: [],
        };
      }
      groupedByDate[date].photos.push(photo);
    });

    res.json({
      photos: Object.values(groupedByDate),
      total: photos.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getPhotos = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const isAdmin = await isUserAdmin(req);
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT tp.*,
             t.amount as transaction_amount,
             t.type as transaction_type,
             c.name as category_name,
             w.name as wallet_name
      FROM transaction_photos tp
      LEFT JOIN transactions t ON tp.transaction_id = t.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN wallets w ON t.wallet_id = w.id
      WHERE 1=1
    `;
    const params = [];

    if (!isAdmin) {
      query += " AND tp.user_id = ?";
      params.push(req.userId);
    }

    // Get total count
    const countQuery = query.replace("SELECT tp.*", "SELECT COUNT(*) as total");
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;

    query += " ORDER BY tp.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [photos] = await pool.query(query, params);

    res.json({
      photos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deletePhoto = async (req, res, next) => {
  try {
    const isAdmin = await isUserAdmin(req);

    let query = "SELECT * FROM transaction_photos WHERE id = ?";
    const params = [req.params.id];

    if (!isAdmin) {
      query += " AND user_id = ?";
      params.push(req.userId);
    }

    const [photos] = await pool.query(query, params);

    if (photos.length === 0) {
      return res.status(404).json({ message: "Photo not found" });
    }

    const photo = photos[0];

    // Extract public_id from Cloudinary URL to delete from Cloudinary
    // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{filename}.{ext}
    const urlParts = photo.photo_url.split("/");
    // Find the index after 'upload' and version (e.g., 'v1234567890')
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
      // Skip 'upload' and version, get everything after
      const pathParts = urlParts.slice(uploadIndex + 2);
      const filenameWithExt = pathParts.pop();
      const filename = filenameWithExt.split(".")[0];
      const publicId = [...pathParts, filename].join("/");

      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.log("Cloudinary delete warning:", err.message);
      }
    }

    await pool.query("DELETE FROM transaction_photos WHERE id = ?", [req.params.id]);

    res.json({ message: "Photo deleted successfully" });
  } catch (error) {
    next(error);
  }
};
