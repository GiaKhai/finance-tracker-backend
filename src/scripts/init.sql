-- Finance Tracker Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('cash', 'bank', 'credit_card', 'e_wallet') DEFAULT 'cash',
  balance DECIMAL(15, 2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'VND',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('INCOME', 'EXPENSE') NOT NULL,
  icon VARCHAR(50) DEFAULT 'category',
  color VARCHAR(7) DEFAULT '#6B7280',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  wallet_id INT NOT NULL,
  category_id INT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  type ENUM('INCOME', 'EXPENSE') NOT NULL,
  note TEXT,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Insert default categories
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
