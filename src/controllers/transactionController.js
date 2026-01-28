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
             tw.name as target_wallet_name,
             u.name as user_name,
             u.email as user_email
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN wallets tw ON t.target_wallet_id = tw.id
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

    const { wallet_id, amount, type, category, description, date, target_wallet_id } = req.body;

    await connection.beginTransaction();

    let transactionType = type ? type.toUpperCase() : "EXPENSE";
    let category_id = null;

    // Validate logic based on Type
    if (transactionType === 'TRANSFER') {
        if (!target_wallet_id) {
             throw new Error("Target wallet is required for transfer");
        }
        if (parseInt(wallet_id) === parseInt(target_wallet_id)) {
            throw new Error("Cannot transfer to the same wallet");
        }

        // Check ownership of both wallets
        const [wallets] = await connection.query(
            "SELECT id FROM wallets WHERE id IN (?, ?) AND user_id = ?",
            [wallet_id, target_wallet_id, req.userId]
        );
        if (wallets.length !== 2) {
             throw new Error("One or both wallets not found or access denied");
        }

    } else {
        // Normal Income/Expense
        const [wallets] = await connection.query(
            "SELECT * FROM wallets WHERE id = ? AND user_id = ?",
            [wallet_id, req.userId]
        );
    
        if (wallets.length === 0) {
          throw new Error("Wallet not found");
        }

        // Determine category_id and transaction type if category is provided
        if (category && !isNaN(category)) {
          category_id = parseInt(category);
    
          const [categories] = await connection.query(
            "SELECT type FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL)",
            [category_id, req.userId]
          );
    
          if (categories.length > 0) {
            transactionType = categories[0].type;
          }
        }
    }

    // Insert transaction
    const [result] = await connection.query(
      "INSERT INTO transactions (user_id, wallet_id, target_wallet_id, category_id, amount, type, note, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        req.userId,
        wallet_id,
        transactionType === 'TRANSFER' ? target_wallet_id : null,
        category_id,
        amount,
        transactionType,
        description,
        date,
      ]
    );

    // Update Balances
    if (transactionType === 'TRANSFER') {
        // Deduct from source
        await connection.query(
            "UPDATE wallets SET balance = balance - ? WHERE id = ?",
            [amount, wallet_id]
        );
        // Add to target
        await connection.query(
            "UPDATE wallets SET balance = balance + ? WHERE id = ?",
            [amount, target_wallet_id]
        );
    } else {
        // Income or Expense
        const multiplier = transactionType === "INCOME" ? 1 : -1;
        await connection.query(
          "UPDATE wallets SET balance = balance + ? WHERE id = ?",
          [amount * multiplier, wallet_id]
        );
    }

    // Check balances (optional: allow negative? requirement says ensure not negative usually, let's keep it safe)
    // Checking source wallet
    const [sourceWallet] = await connection.query("SELECT balance FROM wallets WHERE id = ?", [wallet_id]);
    if (sourceWallet[0].balance < 0) {
         throw new Error("Insufficient balance in source wallet");
    }

    await connection.commit();

    const [transaction] = await pool.query(
      `SELECT t.*, 
              c.name as category_name, 
              c.type as category_type, 
              c.icon as category_icon,
              w.name as wallet_name,
              tw.name as target_wallet_name,
              u.name as user_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN wallets w ON t.wallet_id = w.id
       LEFT JOIN wallets tw ON t.target_wallet_id = tw.id
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
    // Handle manual errors
    if (error.message === "Insufficient balance in source wallet" || 
        error.message === "Cannot transfer to the same wallet" ||
        error.message === "Target wallet is required for transfer") {
        return res.status(400).json({ message: error.message });
    }
    next(error);
  } finally {
    connection.release();
  }
};

export const updateTransaction = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const { amount, type, category, description, date, target_wallet_id } = req.body;
    const isAdmin = await isUserAdmin(req);

    await connection.beginTransaction();

    // Get old transaction
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

    const [oldTransactions] = await connection.query(query, params);

    if (oldTransactions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Transaction not found" });
    }

    const oldTransaction = oldTransactions[0];
    const oldType = oldTransaction.type;

    // 1. Revert old balance changes
    if (oldType === 'TRANSFER') {
        // Revert source wallet: add back amount
        await connection.query(
            "UPDATE wallets SET balance = balance + ? WHERE id = ?",
            [oldTransaction.amount, oldTransaction.wallet_id]
        );
        // Revert target wallet: subtract amount
        await connection.query(
            "UPDATE wallets SET balance = balance - ? WHERE id = ?",
            [oldTransaction.amount, oldTransaction.target_wallet_id]
        );
    } else {
        const oldCatType = oldTransaction.category_type || oldTransaction.type;
        const multiplier = oldCatType === "INCOME" ? -1 : 1;
        await connection.query(
            "UPDATE wallets SET balance = balance + ? WHERE id = ?",
            [oldTransaction.amount * multiplier, oldTransaction.wallet_id]
        );
    }

    // 2. Determine new type and category
    let newType = type ? type.toUpperCase() : oldType;
    let newCategoryId = category || oldTransaction.category_id;
    let newTargetWalletId = target_wallet_id || oldTransaction.target_wallet_id;

    if (newType === 'TRANSFER') {
        if (!newTargetWalletId) {
            throw new Error("Target wallet is required for transfer");
        }
        if (parseInt(oldTransaction.wallet_id) === parseInt(newTargetWalletId)) {
            throw new Error("Cannot transfer to the same wallet");
        }
        newCategoryId = null; // Transfers don't usually have categories
    } else {
        newTargetWalletId = null;
    }

    // 3. Update transaction record
    await connection.query(
      "UPDATE transactions SET amount = ?, type = ?, category_id = ?, target_wallet_id = ?, note = ?, transaction_date = ? WHERE id = ?",
      [amount, newType, newCategoryId, newTargetWalletId, description, date, req.params.id]
    );

    // 4. Apply new balance changes
    if (newType === 'TRANSFER') {
        // From source: subtract amount
        await connection.query(
            "UPDATE wallets SET balance = balance - ? WHERE id = ?",
            [amount, oldTransaction.wallet_id]
        );
        // To target: add amount
        await connection.query(
            "UPDATE wallets SET balance = balance + ? WHERE id = ?",
            [amount, newTargetWalletId]
        );
    } else {
        // Determine category type for balance multiplier
        let effectType = newType;
        if (newCategoryId) {
            const [cats] = await connection.query("SELECT type FROM categories WHERE id = ?", [newCategoryId]);
            if (cats.length > 0) effectType = cats[0].type;
        }
        
        const multiplier = effectType === "INCOME" ? 1 : -1;
        await connection.query(
            "UPDATE wallets SET balance = balance + ? WHERE id = ?",
            [amount * multiplier, oldTransaction.wallet_id]
        );
    }

    // 5. Check if any wallet balance went negative
    const [wallets] = await connection.query(
        "SELECT id, balance FROM wallets WHERE id IN (?, ?)",
        [oldTransaction.wallet_id, newTargetWalletId || 0]
    );
    
    for (const w of wallets) {
        if (w.balance < 0) {
            throw new Error("Insufficient balance in one of the wallets");
        }
    }

    await connection.commit();

    const [transaction] = await pool.query(
      `SELECT t.*, 
              c.name as category_name, 
              c.type as category_type, 
              c.icon as category_icon,
              w.name as wallet_name,
              tw.name as target_wallet_name,
              u.name as user_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN wallets w ON t.wallet_id = w.id
       LEFT JOIN wallets tw ON t.target_wallet_id = tw.id
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
    if (["Insufficient balance in one of the wallets", "Cannot transfer to the same wallet", "Target wallet is required for transfer"].includes(error.message)) {
        return res.status(400).json({ message: error.message });
    }
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
    if (transaction.type === 'TRANSFER') {
        // Add back to source
        await connection.query(
            "UPDATE wallets SET balance = balance + ? WHERE id = ?",
            [transaction.amount, transaction.wallet_id]
        );
        // Subtract from target
        await connection.query(
            "UPDATE wallets SET balance = balance - ? WHERE id = ?",
            [transaction.amount, transaction.target_wallet_id]
        );
    } else {
        const catType = transaction.category_type || transaction.type;
        const multiplier = catType === "INCOME" ? -1 : 1;
        await connection.query(
            "UPDATE wallets SET balance = balance + ? WHERE id = ?",
            [transaction.amount * multiplier, transaction.wallet_id]
        );
    }

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
