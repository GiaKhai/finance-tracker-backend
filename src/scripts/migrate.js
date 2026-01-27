import pool from "../config/database.js";

const migrate = async () => {
  const connection = await pool.getConnection();

  try {
    console.log("🔧 Starting database migration...\n");

    // Add role column to users table if not exists
    try {
      await connection.query(`
        ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user' AFTER password;
      `);
      console.log("✅ Added role column to users table");
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log("ℹ️  Role column already exists");
      } else {
        throw error;
      }
    }

    console.log("\n✅ Database migration completed successfully!");
  } catch (error) {
    console.error("\n❌ Database migration failed:", error.message);
    process.exit(1);
  } finally {
    connection.release();
    process.exit(0);
  }
};

migrate();
