import { validationResult } from "express-validator";
import pool from "../config/database.js";

export const getWallets = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const [countResult] = await pool.query(
      "SELECT COUNT(*) as total FROM wallets WHERE user_id = ?",
      [req.userId]
    );
    const total = countResult[0].total;

    const [wallets] = await pool.query(
      "SELECT * FROM wallets WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [req.userId, parseInt(limit), offset]
    );

    res.json({
      wallets,
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

export const getWalletById = async (req, res, next) => {
  try {
    const [wallets] = await pool.query(
      "SELECT * FROM wallets WHERE id = ? AND user_id = ?",
      [req.params.id, req.userId]
    );

    if (wallets.length === 0) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    res.json({ wallet: wallets[0] });
  } catch (error) {
    next(error);
  }
};

export const createWallet = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, type = "CASH", balance = 0, currency = "VND" } = req.body;

    const [result] = await pool.query(
      "INSERT INTO wallets (user_id, name, type, balance, currency) VALUES (?, ?, ?, ?, ?)",
      [req.userId, name, type.toUpperCase(), balance, currency]
    );

    const [wallet] = await pool.query("SELECT * FROM wallets WHERE id = ?", [
      result.insertId,
    ]);

    res.status(201).json({
      message: "Wallet created successfully",
      wallet: wallet[0],
    });
  } catch (error) {
    next(error);
  }
};

export const updateWallet = async (req, res, next) => {
  try {
    const { name, type, balance, currency } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (type !== undefined) {
      updates.push("type = ?");
      values.push(type.toUpperCase());
    }
    if (balance !== undefined) {
      updates.push("balance = ?");
      values.push(balance);
    }
    if (currency !== undefined) {
      updates.push("currency = ?");
      values.push(currency);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    values.push(req.params.id, req.userId);

    await pool.query(
      `UPDATE wallets SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      values
    );

    const [wallet] = await pool.query(
      "SELECT * FROM wallets WHERE id = ? AND user_id = ?",
      [req.params.id, req.userId]
    );

    if (wallet.length === 0) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    res.json({ message: "Wallet updated successfully", wallet: wallet[0] });
  } catch (error) {
    next(error);
  }
};

export const deleteWallet = async (req, res, next) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM wallets WHERE id = ? AND user_id = ?",
      [req.params.id, req.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    res.json({ message: "Wallet deleted successfully" });
  } catch (error) {
    next(error);
  }
};
