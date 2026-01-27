import pool from "../config/database.js";

const createTables = async () => {
  const connection = await pool.getConnection();

  try {
    console.log("🔧 Starting database initialization...\n");

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Users table created");

    // Create wallets table
    await connection.query(`
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
      )
    `);
    console.log("✅ Wallets table created");

    // Create categories table
    await connection.query(`
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
      )
    `);
    console.log("✅ Categories table created");

    // Create transactions table
    await connection.query(`
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
      )
    `);
    console.log("✅ Transactions table created");

    // Insert default categories
    const [existingCategories] = await connection.query(
      "SELECT COUNT(*) as count FROM categories WHERE user_id IS NULL"
    );

    if (existingCategories[0].count === 0) {
      await connection.query(`
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
      `);
      console.log("✅ Default categories inserted");
    } else {
      console.log("ℹ️  Default categories already exist");
    }

    console.log("\n✅ Database initialization completed successfully!");
  } catch (error) {
    console.error("\n❌ Database initialization failed:", error.message);
    throw error;
  } finally {
    connection.release();
  }
};

// Run initialization
createTables()
  .then(() => {
    console.log("\n🎉 Setup complete! You can now start the server.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Setup failed:", error);
    process.exit(1);
  });
