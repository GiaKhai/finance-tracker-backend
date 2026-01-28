import { validationResult } from "express-validator";
import pool from "../config/database.js";

// Helper to check admin role (fallback to DB if not in token)
const isUserAdmin = async (req) => {
  if (req.userRole === 'admin') return true;
  // Fallback check DB
  const [users] = await pool.query("SELECT role FROM users WHERE id = ?", [req.userId]);
  return users[0]?.role === 'admin';
};

export const getTransactions = async (req, res, next) => {
  try {
    const {
      wallet_id,
      category_id,
      type,
      start_date,
      end_date,
      page = 1,
      limit = 50,
      user_id: filterUserId
    } = req.query;

    const isAdmin = await isUserAdmin(req);
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT t.*, 
             c.name as category_name, 
             c.type as category_type, 
             c.icon as category_icon,
             w.name as wallet_name,
             u.name as user_name,
             u.email as user_email
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    // If not admin, restrict to own data
    if (!isAdmin) {
      query += " AND t.user_id = ?";
      params.push(req.userId);
    } else if (filterUserId) {
       // Admin filtering by specific user
       query += " AND t.user_id = ?";
       params.push(filterUserId);
    }

    if (wallet_id) {
      query += " AND t.wallet_id = ?";
      params.push(wallet_id);
    }

    if (category_id) {
      query += " AND t.category_id = ?";
      params.push(category_id);
    }

    if (type) {
      query += " AND c.type = ?";
      params.push(type.toUpperCase());
    }

    if (start_date) {
      query += " AND t.transaction_date >= ?";
      params.push(start_date);
    }

    if (end_date) {
      query += " AND t.transaction_date <= ?";
      params.push(end_date);
    }

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const countParams = [];

    if (!isAdmin) {
        countQuery += " AND t.user_id = ?";
        countParams.push(req.userId);
    } else if (filterUserId) {
        countQuery += " AND t.user_id = ?";
        countParams.push(filterUserId);
    }

    if (wallet_id) {
      countQuery += " AND t.wallet_id = ?";
      countParams.push(wallet_id);
    }

    if (category_id) {
      countQuery += " AND t.category_id = ?";
      countParams.push(category_id);
    }

    if (type) {
      countQuery += " AND c.type = ?";
      countParams.push(type.toUpperCase());
    }

    if (start_date) {
      countQuery += " AND t.transaction_date >= ?";
      countParams.push(start_date);
    }

    if (end_date) {
      countQuery += " AND t.transaction_date <= ?";
      countParams.push(end_date);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    query +=
      " ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [transactions] = await pool.query(query, params);

    res.json({
      transactions,
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

export const getAllTransactions = async (req, res, next) => {
  try {
    const {
      wallet_id,
      category_id,
      type,
      start_date,
      end_date,
    } = req.query;

    const isAdmin = await isUserAdmin(req);

    let query = `
      SELECT t.*, 
             c.name as category_name, 
             c.type as category_type, 
             c.icon as category_icon,
             w.name as wallet_name,
             u.name as user_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (!isAdmin) {
        query += " AND t.user_id = ?";
        params.push(req.userId);
    }

    if (wallet_id) {
      query += " AND t.wallet_id = ?";
      params.push(wallet_id);
    }

    if (category_id) {
      query += " AND t.category_id = ?";
      params.push(category_id);
    }

    if (type) {
      query += " AND c.type = ?";
      params.push(type.toUpperCase());
    }

    if (start_date) {
      query += " AND t.transaction_date >= ?";
      params.push(start_date);
    }

    if (end_date) {
      query += " AND t.transaction_date <= ?";
      params.push(end_date);
    }
  
    query += " ORDER BY t.transaction_date DESC, t.created_at DESC";    

    const [transactions] = await pool.query(query, params);

    res.json({
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

export const getTransactionById = async (req, res, next) => {
  try {
    const isAdmin = await isUserAdmin(req);
    
    let query = `
        SELECT t.*, 
               c.name as category_name, 
               c.type as category_type, 
               c.icon as category_icon,
               w.name as wallet_name,
               u.name as user_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN wallets w ON t.wallet_id = w.id
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.id = ?
    `;
    const params = [req.params.id];

    if (!isAdmin) {
        query += " AND t.user_id = ?";
        params.push(req.userId);
    }

    const [transactions] = await pool.query(query, params);

    if (transactions.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json({ transaction: transactions[0] });
  } catch (error) {
    next(error);
  }
};

export const createTransaction = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { wallet_id, amount, type, category, description, date } = req.body;

    await connection.beginTransaction();

    // Verify wallet belongs to user (Admin can create for others? Let's assume strict for now, or just self)
    // For now, assume creation is for self even if admin.
    const [wallets] = await connection.query(
      "SELECT * FROM wallets WHERE id = ? AND user_id = ?",
      [wallet_id, req.userId]
    );

    if (wallets.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Wallet not found" });
    }

    // Determine category_id and transaction type
    let category_id = null;
    let transactionType = type ? type.toUpperCase() : "EXPENSE";

    // If category is provided as ID (number), use it
    if (category && !isNaN(category)) {
      category_id = parseInt(category);

      // Verify category exists and get its type
      const [categories] = await connection.query(
        "SELECT type FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL)",
        [category_id, req.userId]
      );

      if (categories.length > 0) {
        transactionType = categories[0].type;
      }
    }

    // Insert transaction
    const [result] = await connection.query(
      "INSERT INTO transactions (user_id, wallet_id, category_id, amount, type, note, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        req.userId,
        wallet_id,
        category_id,
        amount,
        transactionType,
        description,
        date,
      ]
    );

    // Update wallet balance
    const multiplier = transactionType === "INCOME" ? 1 : -1;
    await connection.query(
      "UPDATE wallets SET balance = balance + ? WHERE id = ?",
      [amount * multiplier, wallet_id]
    );

    // Check balance is not negative
    const [updatedWallet] = await connection.query(
      "SELECT balance FROM wallets WHERE id = ?",
      [wallet_id]
    );

    if (updatedWallet[0].balance < 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Insufficient balance" });
    }

    await connection.commit();

    const [transaction] = await pool.query(
      `SELECT t.*, 
              c.name as category_name, 
              c.type as category_type, 
              c.icon as category_icon,
              w.name as wallet_name,
              u.name as user_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN wallets w ON t.wallet_id = w.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: "Transaction created successfully",
      transaction: transaction[0],
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

export const updateTransaction = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const { amount, type, category, description, date } = req.body;
    const isAdmin = await isUserAdmin(req);

    await connection.beginTransaction();

    // Get old transaction with category type
    let query = `
       SELECT t.*, c.type as category_type
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?
    `;
    const params = [req.params.id];
    
    // Only verify ownership if not admin
    if (!isAdmin) {
        query += " AND t.user_id = ?";
        params.push(req.userId);
    }

    const [oldTransactions] = await connection.query(query, params);

    if (oldTransactions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Transaction not found" });
    }

    const oldTransaction = oldTransactions[0];

    // Revert old balance
    const oldMultiplier = oldTransaction.category_type === "INCOME" ? -1 : 1;
    await connection.query(
      "UPDATE wallets SET balance = balance + ? WHERE id = ?",
      [oldTransaction.amount * oldMultiplier, oldTransaction.wallet_id]
    );

    // Get new category type if category is being updated
    let newCategoryType = oldTransaction.category_type;
    if (category) {
       // Check category access - if admin, can access all? simplified for now
       let catQuery = "SELECT type FROM categories WHERE id = ?";
       let catParams = [category];
       if (!isAdmin) {
          catQuery += " AND (user_id = ? OR user_id IS NULL)";
          catParams.push(req.userId);
       }

      const [categories] = await connection.query(catQuery, catParams);
      if (categories.length > 0) {
        newCategoryType = categories[0].type;
      }
    }

    // Update transaction
    await connection.query(
      "UPDATE transactions SET amount = ?, category_id = ?, note = ?, transaction_date = ? WHERE id = ?",
      [amount, category, description, date, req.params.id]
    );

    // Apply new balance
    const newMultiplier = newCategoryType === "INCOME" ? 1 : -1;
    await connection.query(
      "UPDATE wallets SET balance = balance + ? WHERE id = ?",
      [amount * newMultiplier, oldTransaction.wallet_id]
    );

    // Check balance
    const [wallet] = await connection.query(
      "SELECT balance FROM wallets WHERE id = ?",
      [oldTransaction.wallet_id]
    );

    if (wallet[0].balance < 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Insufficient balance" });
    }

    await connection.commit();

    const [transaction] = await pool.query(
      `SELECT t.*, 
              c.name as category_name, 
              c.type as category_type, 
              c.icon as category_icon,
              w.name as wallet_name,
              u.name as user_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN wallets w ON t.wallet_id = w.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [req.params.id]
    );

    res.json({
      message: "Transaction updated successfully",
      transaction: transaction[0],
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

export const deleteTransaction = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const isAdmin = await isUserAdmin(req);
    await connection.beginTransaction();

    let query = `
       SELECT t.*, c.type as category_type
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?
    `;
    const params = [req.params.id];
    
    if (!isAdmin) {
        query += " AND t.user_id = ?";
        params.push(req.userId);
    }

    const [transactions] = await connection.query(query, params);

    if (transactions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Transaction not found" });
    }

    const transaction = transactions[0];

    // Revert balance
    const multiplier = transaction.category_type === "INCOME" ? -1 : 1;
    await connection.query(
      "UPDATE wallets SET balance = balance + ? WHERE id = ?",
      [transaction.amount * multiplier, transaction.wallet_id]
    );

    // Delete transaction
    await connection.query("DELETE FROM transactions WHERE id = ?", [
      req.params.id,
    ]);

    await connection.commit();

    res.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};
