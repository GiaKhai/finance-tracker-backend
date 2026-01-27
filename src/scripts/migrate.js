import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrate = async () => {
  const connection = await pool.getConnection();

  try {
    console.log("🔧 Starting database migration check...");

    // 1. Create migrations table if it doesn't exist to track history
    await connection.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Get list of already executed migrations
    const [executedRows] = await connection.query("SELECT name FROM migrations");
    const executedMigrations = new Set(executedRows.map((row) => row.name));

    // 3. Read migration files from src/migrations
    const migrationsDir = path.join(__dirname, "../migrations");
    if (!fs.existsSync(migrationsDir)) {
      console.log("📂 No migrations folder found. Skipping.");
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort(); // Ensure files run in order (001, 002, etc.)

    // 4. Run new migrations
    for (const file of files) {
      if (!executedMigrations.has(file)) {
        console.log(`🚀 Running migration: ${file}`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, "utf8");

        try {
          await connection.beginTransaction();
          
          // Execute SQL commands (split by ; for multiple statements support if needed)
          // For simplicity in this specialized script, we assume one statement or handle differently.
          // Since mysql2 query() handles multiple statements if configured, but usually safer to run one by one.
          // Here strictly running the file content.
          await connection.query(sql);

          await connection.query("INSERT INTO migrations (name) VALUES (?)", [
            file,
          ]);

          await connection.commit();
          console.log(`✅ Completed: ${file}`);
        } catch (err) {
            await connection.rollback();
            // If error is "Duplicate column name", we can treat it as success or skip
            // But with the tracking table, this creates a robust history.
            // However, for existing databases where the column might already exist but not in tracking table:
            if (err.code === 'ER_DUP_FIELDNAME') {
                 console.log(`⚠️  Skipping ${file}: Column/Field already exists.`);
                 // Mark as executed so we don't try again
                 await connection.query("INSERT INTO migrations (name) VALUES (?)", [file]);
                 await connection.commit();
            } else {
                console.error(`❌ Failed: ${file}`, err);
                throw err; // Stop migration process on error
            }
        }
      }
    }

    console.log("✨  Migration process finished.\n");
  } catch (error) {
    console.error("❌ Migration system error:", error);
    process.exit(1);
  } finally {
    connection.release();
    if (process.argv[1] === fileURLToPath(import.meta.url)) {
      process.exit(0);
    }
  }
};

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate();
}

export default migrate;
