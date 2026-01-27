-- Initial Schema Migration
-- This file contains the foundational schema for the application.
-- It ensures that if the database is empty, all necessary tables are created.

-- =====================================================
-- TABLE: users
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: categories
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NULL,
  name VARCHAR(100) NOT NULL,
  type ENUM('INCOME', 'EXPENSE') NOT NULL,
  icon VARCHAR(50) DEFAULT '💰',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: wallets
-- =====================================================
CREATE TABLE IF NOT EXISTS wallets (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  type ENUM('CASH', 'BANK', 'CREDIT', 'EWALLET') NOT NULL DEFAULT 'CASH',
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'VND',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: transactions
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  wallet_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NULL,
  amount DECIMAL(15, 2) NOT NULL,
  type ENUM('INCOME', 'EXPENSE') NOT NULL DEFAULT 'EXPENSE',
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
  INDEX idx_transaction_date (transaction_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SEED: Default Categories
-- =====================================================
INSERT INTO categories (user_id, name, type, icon, color) VALUES
(NULL, 'Salary', 'INCOME', 'payments', '#10B981'),
(NULL, 'Business', 'INCOME', 'business_center', '#059669'),
(NULL, 'Investment', 'INCOME', 'trending_up', '#34D399'),
(NULL, 'Gift', 'INCOME', 'card_giftcard', '#6EE7B7'),
(NULL, 'Other Income', 'INCOME', 'add_circle', '#A7F3D0'),
(NULL, 'Food & Dining', 'EXPENSE', 'restaurant', '#EF4444'),
(NULL, 'Shopping', 'EXPENSE', 'shopping_cart', '#DC2626'),
(NULL, 'Transportation', 'EXPENSE', 'directions_car', '#F97316'),
(NULL, 'Entertainment', 'EXPENSE', 'movie', '#F59E0B'),
(NULL, 'Bills & Utilities', 'EXPENSE', 'receipt', '#EAB308'),
(NULL, 'Healthcare', 'EXPENSE', 'local_hospital', '#EC4899'),
(NULL, 'Education', 'EXPENSE', 'school', '#8B5CF6'),
(NULL, 'Travel', 'EXPENSE', 'flight', '#3B82F6'),
(NULL, 'Other Expense', 'EXPENSE', 'remove_circle', '#6B7280')
ON DUPLICATE KEY UPDATE name=name;

-- =====================================================
-- SEED: Default Admin User
-- =====================================================
INSERT INTO users (name, email, password, role) 
VALUES ('System Admin', 'admin@example.com', '$2a$10$sdH.Kxjm2K7LmHqLZxn2wulfG0SPIg02CfoNE4GHGTuDbCFAakXVi', 'admin')
ON DUPLICATE KEY UPDATE role='admin';
