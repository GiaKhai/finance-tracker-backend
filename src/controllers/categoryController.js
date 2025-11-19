import { validationResult } from "express-validator";
import pool from "../config/database.js";

export const getCategories = async (req, res, next) => {
  try {
    const { type, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT * FROM categories 
      WHERE user_id IS NULL OR user_id = ?
    `;
    const params = [req.userId];

    if (type) {
      query += " AND type = ?";
      params.push(type.toUpperCase());
    }

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total FROM categories 
      WHERE user_id IS NULL OR user_id = ?
    `;
    const countParams = [req.userId];

    if (type) {
      countQuery += " AND type = ?";
      countParams.push(type.toUpperCase());
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    query += " ORDER BY type, name LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [categories] = await pool.query(query, params);

    res.json({
      categories,
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

export const getCategoryById = async (req, res, next) => {
  try {
    const [categories] = await pool.query(
      "SELECT * FROM categories WHERE id = ? AND (user_id IS NULL OR user_id = ?)",
      [req.params.id, req.userId]
    );

    if (categories.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ category: categories[0] });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, type, icon } = req.body;

    const [result] = await pool.query(
      "INSERT INTO categories (user_id, name, type, icon) VALUES (?, ?, ?, ?)",
      [req.userId, name, type.toUpperCase(), icon || "💰"]
    );

    const [category] = await pool.query(
      "SELECT * FROM categories WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Category created successfully",
      category: category[0],
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { name, type, icon } = req.body;

    // Check if category belongs to user (can't update global categories)
    const [existing] = await pool.query(
      "SELECT * FROM categories WHERE id = ? AND user_id = ?",
      [req.params.id, req.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Category not found or cannot be edited",
      });
    }

    await pool.query(
      "UPDATE categories SET name = ?, type = ?, icon = ? WHERE id = ?",
      [name, type.toUpperCase(), icon, req.params.id]
    );

    const [category] = await pool.query(
      "SELECT * FROM categories WHERE id = ?",
      [req.params.id]
    );

    res.json({
      message: "Category updated successfully",
      category: category[0],
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    // Check if category exists and belongs to user (can't delete global categories)
    const [existing] = await pool.query(
      "SELECT * FROM categories WHERE id = ?",
      [req.params.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    // Check if it's a global category
    if (existing[0].user_id === null) {
      return res.status(403).json({
        message: "Cannot delete global categories",
      });
    }

    // Check if it belongs to the user
    if (existing[0].user_id !== req.userId) {
      return res.status(403).json({
        message: "You don't have permission to delete this category",
      });
    }

    // Check if category is being used in transactions
    const [transactions] = await pool.query(
      "SELECT COUNT(*) as count FROM transactions WHERE category_id = ?",
      [req.params.id]
    );

    if (transactions[0].count > 0) {
      return res.status(400).json({
        message: `Cannot delete category. It is being used in ${transactions[0].count} transaction(s)`,
      });
    }

    await pool.query("DELETE FROM categories WHERE id = ?", [req.params.id]);

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    next(error);
  }
};
