-- =====================================================
-- Finance Tracker Database Schema
-- Database Architect: Senior Level Design
-- Version: 2.0
-- =====================================================

-- Drop existing database if needed (use with caution in production)
-- DROP DATABASE IF EXISTS finance_tracker;

CREATE DATABASE IF NOT EXISTS finance_tracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE finance_tracker;

-- =====================================================
-- TABLE: users
-- Description: Stores user account information
-- =====================================================
CREATE TABLE users (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password',
  name VARCHAR(100) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='User accounts table';

-- =====================================================
-- TABLE: categories
-- Description: Transaction categories (global and user-specific)
-- =====================================================
CREATE TABLE categories (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NULL COMMENT 'NULL = global category, NOT NULL = user-specific',
  name VARCHAR(100) NOT NULL,
  type ENUM('INCOME', 'EXPENSE') NOT NULL,
  icon VARCHAR(50) DEFAULT '💰' COMMENT 'Emoji or icon identifier',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_user_type (user_id, type),
  
  CONSTRAINT chk_category_name CHECK (CHAR_LENGTH(name) >= 2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Transaction categories (global and user-specific)';

-- =====================================================
-- TABLE: wallets
-- Description: User wallets/accounts
-- =====================================================
CREATE TABLE wallets (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  type ENUM('CASH', 'BANK', 'CREDIT', 'EWALLET') NOT NULL DEFAULT 'CASH',
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Current balance',
  currency VARCHAR(3) DEFAULT 'VND' COMMENT 'ISO 4217 currency code',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_user_type (user_id, type),
  
  CONSTRAINT chk_wallet_name CHECK (CHAR_LENGTH(name) >= 2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='User wallets and accounts';

-- =====================================================
-- TABLE: transactions
-- Description: Financial transactions
-- =====================================================
CREATE TABLE transactions (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  wallet_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NULL COMMENT 'NULL allowed for uncategorized transactions',
  amount DECIMAL(15, 2) NOT NULL,
  type ENUM('INCOME', 'EXPENSE') NOT NULL DEFAULT 'EXPENSE' COMMENT 'Transaction type',
  transaction_date DATE NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  
  INDEX idx_user_id (user_id),
  INDEX idx_wallet_id (wallet_id),
  INDEX idx_category_id (category_id),
  INDEX idx_type (type),
  INDEX idx_transaction_date (transaction_date),
  INDEX idx_user_date (user_id, transaction_date),
  INDEX idx_wallet_date (wallet_id, transaction_date),
  INDEX idx_user_type_date (user_id, type, transaction_date),
  INDEX idx_created_at (created_at),
  
  CONSTRAINT chk_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Financial transactions';


-- Sample User (password: 123456)
-- INSERT INTO users (email, password_hash, name) VALUES 
-- ('demo@example.com', '$2a$10$YourHashedPasswordHere', 'Demo User');

-- =====================================================
-- USEFUL QUERIES FOR VERIFICATION
-- =====================================================

-- View all global categories
-- SELECT * FROM categories WHERE user_id IS NULL ORDER BY type, name;

-- View wallet balances for a user
-- SELECT w.name, w.type, w.balance, w.currency 
-- FROM wallets w 
-- WHERE w.user_id = 1;

-- View recent transactions with category names
-- SELECT 
--   t.transaction_date,
--   c.name as category,
--   c.type,
--   t.amount,
--   w.name as wallet,
--   t.note
-- FROM transactions t
-- LEFT JOIN categories c ON t.category_id = c.id
-- LEFT JOIN wallets w ON t.wallet_id = w.id
-- WHERE t.user_id = 1
-- ORDER BY t.transaction_date DESC
-- LIMIT 10;
