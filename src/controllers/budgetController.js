import { validationResult } from "express-validator";
import pool from "../config/database.js";

export const getBudgets = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    // Query to get budgets along with the total spent for that category in the target month/year
    const query = `
      SELECT 
        b.*,
        c.name as category_name,
        c.icon as category_icon,
        COALESCE(SUM(t.amount), 0) as spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t ON 
        b.category_id = t.category_id AND 
        b.user_id = t.user_id AND 
        t.type = 'EXPENSE' AND
        MONTH(t.transaction_date) = ? AND 
        YEAR(t.transaction_date) = ?
      WHERE b.user_id = ?
      GROUP BY b.id
    `;

    const [budgets] = await pool.query(query, [targetMonth, targetYear, req.userId]);

    res.json({ budgets });
  } catch (error) {
    next(error);
  }
};

export const createBudget = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category_id, amount, period = 'MONTHLY' } = req.body;

    // Check if budget already exists for this category
    const [existing] = await pool.query(
        "SELECT id FROM budgets WHERE user_id = ? AND category_id = ?",
        [req.userId, category_id]
    );

    if (existing.length > 0) {
        return res.status(400).json({ message: "Budget for this category already exists" });
    }

    const [result] = await pool.query(
      "INSERT INTO budgets (user_id, category_id, amount, period) VALUES (?, ?, ?, ?)",
      [req.userId, category_id, amount, period]
    );

    const [newBudget] = await pool.query(
      `SELECT b.*, c.name as category_name 
       FROM budgets b 
       JOIN categories c ON b.category_id = c.id 
       WHERE b.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ message: "Budget created", budget: newBudget[0] });
  } catch (error) {
    next(error);
  }
};

export const updateBudget = async (req, res, next) => {
  try {
    const { amount, period } = req.body;
    
    // Check ownership
    const [budget] = await pool.query("SELECT * FROM budgets WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
    if (budget.length === 0) {
        return res.status(404).json({ message: "Budget not found" });
    }

    await pool.query(
      "UPDATE budgets SET amount = ?, period = ? WHERE id = ?",
      [amount, period || budget[0].period, req.params.id]
    );

    res.json({ message: "Budget updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const deleteBudget = async (req, res, next) => {
  try {
    const [result] = await pool.query(
        "DELETE FROM budgets WHERE id = ? AND user_id = ?",
        [req.params.id, req.userId]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Budget not found" });
    }

    res.json({ message: "Budget deleted successfully" });
  } catch (error) {
    next(error);
  }
};
