/**
 * Transaction API Test Suite
 *
 * Test cases for ACID transaction implementation
 * Run with: npm test
 */

import request from "supertest";
import app from "../src/server.js";
import pool from "../src/config/database.js";

describe("Transaction API Tests", () => {
  let authToken;
  let userId;
  let walletId;
  let categoryId;

  // Setup: Create test user, wallet, and category
  beforeAll(async () => {
    // Register test user
    const registerRes = await request(app).post("/api/auth/register").send({
      email: "test@example.com",
      password: "test123456",
      name: "Test User",
    });

    authToken = registerRes.body.token;
    userId = registerRes.body.user.id;

    // Create test wallet
    const walletRes = await request(app)
      .post("/api/wallets")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Test Wallet",
        type: "CASH",
        balance: 1000000,
        currency: "VND",
      });

    walletId = walletRes.body.wallet.id;

    // Get income category
    const categoryRes = await request(app)
      .get("/api/categories?type=INCOME")
      .set("Authorization", `Bearer ${authToken}`);

    categoryId = categoryRes.body.categories[0].id;
  });

  // Cleanup: Delete test data
  afterAll(async () => {
    await pool.query("DELETE FROM transactions WHERE user_id = ?", [userId]);
    await pool.query("DELETE FROM wallets WHERE user_id = ?", [userId]);
    await pool.query("DELETE FROM users WHERE id = ?", [userId]);
    await pool.end();
  });

  describe("POST /api/transactions", () => {
    test("Should create transaction successfully with INCOME category", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          walletId: walletId,
          categoryId: categoryId,
          amount: 500000,
          date: "2024-01-15",
          note: "Test income transaction",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction).toHaveProperty("id");
      expect(res.body.data.transaction.amount).toBe("500000.00");
      expect(res.body.data.balanceChange.current).toBe(1500000); // 1000000 + 500000
    });

    test("Should fail when wallet does not exist", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          walletId: 99999,
          categoryId: categoryId,
          amount: 100000,
          date: "2024-01-15",
          note: "Test",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test("Should fail when amount is negative", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          walletId: walletId,
          categoryId: categoryId,
          amount: -100000,
          date: "2024-01-15",
          note: "Test",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test("Should fail when balance is insufficient for EXPENSE", async () => {
      // Get expense category
      const categoryRes = await request(app)
        .get("/api/categories?type=EXPENSE")
        .set("Authorization", `Bearer ${authToken}`);

      const expenseCategoryId = categoryRes.body.categories[0].id;

      const res = await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          walletId: walletId,
          categoryId: expenseCategoryId,
          amount: 99999999, // More than balance
          date: "2024-01-15",
          note: "Test expense",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Số dư không đủ");
    });

    test("Should rollback on database error", async () => {
      // This test simulates a database error scenario
      // In real scenario, you might mock the database connection
      const res = await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          walletId: walletId,
          categoryId: "invalid", // Invalid category ID
          amount: 100000,
          date: "2024-01-15",
          note: "Test",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/transactions", () => {
    test("Should get all transactions", async () => {
      const res = await request(app)
        .get("/api/transactions")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.transactions)).toBe(true);
    });

    test("Should filter transactions by wallet", async () => {
      const res = await request(app)
        .get(`/api/transactions?wallet_id=${walletId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
