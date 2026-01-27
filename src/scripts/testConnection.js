import pool from "../config/database.js";

async function testConnection() {
  console.log("🔍 Testing database connection...\n");

  try {
    // Test basic connection
    const connection = await pool.getConnection();
    console.log("✅ Database connection successful!");

    // Test query
    const [rows] = await connection.query("SELECT 1 + 1 AS result");
    console.log("✅ Query test successful:", rows[0]);

    // Check database info
    const [dbInfo] = await connection.query(
      "SELECT DATABASE() as db, VERSION() as version"
    );
    console.log("✅ Database info:", dbInfo[0]);

    // List tables
    const [tables] = await connection.query("SHOW TABLES");
    console.log("\n📊 Tables in database:");
    if (tables.length === 0) {
      console.log(
        "   ⚠️  No tables found. Run initDatabase.js to create tables."
      );
    } else {
      tables.forEach((table) => {
        console.log(`   - ${Object.values(table)[0]}`);
      });
    }

    connection.release();
    console.log("\n✅ All tests passed!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Database connection failed!");
    console.error("Error:", error.message);
    console.error("\nTroubleshooting:");
    console.error("1. Check if MySQL service is running");
    console.error("2. Verify environment variables:");
    console.error("   - DB_HOST:", process.env.DB_HOST || "not set");
    console.error("   - DB_USER:", process.env.DB_USER || "not set");
    console.error("   - DB_NAME:", process.env.DB_NAME || "not set");
    console.error("   - DB_PORT:", process.env.DB_PORT || "not set");
    console.error("3. Check if database exists");
    console.error("4. Verify MySQL credentials");
    process.exit(1);
  }
}

testConnection();
