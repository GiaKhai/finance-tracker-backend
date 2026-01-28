import { validationResult } from "express-validator";
import pool from "../config/database.js";
import bcrypt from "bcryptjs";

// Get all users (Admin only)
export const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, role } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = "SELECT id, name, email, role, created_at FROM users WHERE 1=1";
    let countQuery = "SELECT COUNT(*) as total FROM users WHERE 1=1";
    const params = [];
    const countParams = [];

    if (search) {
      const searchPart = " AND (name LIKE ? OR email LIKE ?)";
      query += searchPart;
      countQuery += searchPart;
      params.push(`%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (role) {
      const rolePart = " AND role = ?";
      query += rolePart;
      countQuery += rolePart;
      params.push(role);
      countParams.push(role);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [users] = await pool.query(query, params);

    res.json({
      users,
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

// Get user by ID
export const getUserById = async (req, res, next) => {
  try {
    const [users] = await pool.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user: users[0] });
  } catch (error) {
    next(error);
  }
};

// Create User (Admin)
export const createUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role } = req.body;

    // Check existing email
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role || 'user']
    );

    res.status(201).json({
      message: "User created successfully",
      user: { id: result.insertId, name, email, role },
    });
  } catch (error) {
    next(error);
  }
};

// Update User
export const updateUser = async (req, res, next) => {
  try {
    const { name, role, email, password } = req.body;

    // Check if user exists
    const [existing] = await pool.query("SELECT * FROM users WHERE id = ?", [
      req.params.id,
    ]);

    if (existing.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    let query = "UPDATE users SET name = ?, email = ?, role = ?";
    const params = [name, email, role];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ", password = ?";
      params.push(hashedPassword);
    }

    query += " WHERE id = ?";
    params.push(req.params.id);

    await pool.query(query, params);

    const [updatedUser] = await pool.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
      [req.params.id]
    );

    res.json({
      message: "User updated successfully",
      user: updatedUser[0],
    });
  } catch (error) {
    next(error);
  }
};

// Delete User
export const deleteUser = async (req, res, next) => {
  try {
    const [existing] = await pool.query("SELECT id FROM users WHERE id = ?", [
      req.params.id,
    ]);

    if (existing.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent deleting yourself
    if (parseInt(req.params.id) === req.userId) {
       return res.status(400).json({ message: "Cannot delete your own account" });
    }

    await pool.query("DELETE FROM users WHERE id = ?", [req.params.id]);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// Update profile (Current User)
export const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const userId = req.userId;

    // Check if email is already taken by another user
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [email, userId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already in use" });
    }

    await pool.query("UPDATE users SET name = ?, email = ? WHERE id = ?", [
      name,
      email,
      userId,
    ]);

    const [updatedUser] = await pool.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
      [userId]
    );

    res.json({
      message: "Profile updated successfully",
      user: updatedUser[0],
    });
  } catch (error) {
    next(error);
  }
};

// Change password (Current User)
export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;

    const [users] = await pool.query("SELECT password FROM users WHERE id = ?", [
      userId,
    ]);
    const user = users[0];

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isValidPassword) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = ? WHERE id = ?", [
      hashedNewPassword,
      userId,
    ]);

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};
