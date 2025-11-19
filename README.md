# 🔧 Finance Tracker Backend

Backend API for Finance Tracker application, built with Node.js, Express, and MySQL.

## 📋 Requirements

- Node.js 18+
- MySQL 8.0+
- npm or yarn

## 🚀 Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Database

Create MySQL database:

```sql
CREATE DATABASE finance_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` file:

```env
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=finance_tracker
DB_PORT=3306

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRE=7d
```

### 4. Import Database Schema

```bash
mysql -u root -p finance_tracker < src/config/database.sql
```

Or use script:

```bash
./scripts/reset-database.sh
```

### 5. Run Server

**Development mode:**

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

Server will run at: `http://localhost:5000`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          # MySQL connection
│   │   └── database.sql         # Database schema
│   ├── controllers/
│   │   ├── authController.js    # Authentication logic
│   │   ├── walletController.js  # Wallet CRUD
│   │   ├── transactionController.js
│   │   └── categoryController.js
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   └── errorHandler.js      # Error handling
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── walletRoutes.js
│   │   ├── transactionRoutes.js
│   │   └── categoryRoutes.js
│   └── server.js                # Entry point
├── migrations/
│   └── add_ewallet_type.sql     # Database migrations
├── tests/
│   └── transaction.test.js      # Unit tests
├── .env.example
├── package.json
└── README.md
```

## 🔌 API Endpoints

### Authentication

#### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### Get Profile

```http
GET /api/auth/profile
Authorization: Bearer {token}
```

### Wallets

#### Get All Wallets

```http
GET /api/wallets?page=1&limit=10
Authorization: Bearer {token}
```

Response:

```json
{
  "wallets": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

#### Create Wallet

```http
POST /api/wallets
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Cash Wallet",
  "type": "CASH",
  "balance": 1000000,
  "currency": "VND"
}
```

#### Update Wallet

```http
PUT /api/wallets/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Name",
  "type": "BANK",
  "balance": 2000000
}
```

#### Delete Wallet

```http
DELETE /api/wallets/:id
Authorization: Bearer {token}
```

### Transactions

#### Get All Transactions

```http
GET /api/transactions?page=1&limit=10&wallet_id=1&type=EXPENSE
Authorization: Bearer {token}
```

Query Parameters:

- `page` - Current page (default: 1)
- `limit` - Items per page (default: 10)
- `wallet_id` - Filter by wallet
- `category_id` - Filter by category
- `type` - Filter by type (INCOME/EXPENSE)
- `start_date` - From date (YYYY-MM-DD)
- `end_date` - To date (YYYY-MM-DD)

#### Create Transaction

```http
POST /api/transactions
Authorization: Bearer {token}
Content-Type: application/json

{
  "wallet_id": 1,
  "category": 5,
  "amount": 50000,
  "type": "expense",
  "date": "2024-01-15",
  "description": "Lunch"
}
```

### Categories

#### Get All Categories

```http
GET /api/categories?page=1&limit=50&type=EXPENSE
Authorization: Bearer {token}
```

#### Create Category

```http
POST /api/categories
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Food",
  "type": "EXPENSE",
  "icon": "🍔"
}
```

## 🗄️ Database Schema

### Users Table

```sql
CREATE TABLE users (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Wallets Table

```sql
CREATE TABLE wallets (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  type ENUM('CASH', 'BANK', 'CREDIT', 'EWALLET') NOT NULL DEFAULT 'CASH',
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'VND',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Transactions Table

```sql
CREATE TABLE transactions (
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
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
```

### Categories Table

```sql
CREATE TABLE categories (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NULL,
  name VARCHAR(100) NOT NULL,
  type ENUM('INCOME', 'EXPENSE') NOT NULL,
  icon VARCHAR(50) DEFAULT '💰',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 🚀 Deploy

📚 **[DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md)** - Complete step-by-step guide

### Deploy to Railway (Summary)

1. **Push code to GitHub**

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/finance-tracker-backend.git
git push -u origin main
```

2. **Deploy on Railway**

- Visit https://railway.app
- Login with GitHub
- Click "New Project" → "Deploy from GitHub repo"
- Select `finance-tracker-backend`

3. **Add MySQL Database**

- Click "New" → "Database" → "Add MySQL"
- Railway automatically creates database

4. **Set Environment Variables**

```env
NODE_ENV=production
PORT=5000
DB_HOST=${{MySQL.MYSQLHOST}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
DB_PORT=${{MySQL.MYSQLPORT}}
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRE=7d
```

5. **Import Database Schema**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and connect
railway login
railway link
railway connect MySQL

# Paste content from src/config/database.sql
```

6. **Get Backend URL**

Railway will provide URL: `https://your-backend.railway.app`

### Deploy to Render

1. **Push code to GitHub** (same as above)

2. **Deploy on Render**

- Visit https://render.com
- Click "New +" → "Web Service"
- Connect GitHub repository
- Configure:
  - **Build Command**: `npm install`
  - **Start Command**: `npm start`

3. **Configure Database**

Use MySQL from:

- FreeSQLDatabase.com
- db4free.net
- Or PostgreSQL free from Render

4. **Set Environment Variables** (same as Railway)

## 🧪 Testing

```bash
# Run tests
npm test

# Test with coverage
npm run test:coverage
```

## 🔧 Troubleshooting

### Database connection error

```bash
# Check MySQL is running
mysql -u root -p

# Check connection string
node -e "require('./src/config/database.js')"
```

### JWT error

```bash
# Ensure JWT_SECRET is set
echo $JWT_SECRET

# Or check .env
cat .env | grep JWT_SECRET
```

### Port already in use

```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>
```

## 📝 Scripts

```bash
npm run dev      # Run development server with nodemon
npm start        # Run production server
npm test         # Run tests
```

## 🔐 Security

- Passwords hashed with bcrypt
- JWT tokens for authentication
- SQL injection protection with prepared statements
- CORS configuration
- Environment variables for sensitive data

## 📚 Dependencies

- **express** - Web framework
- **mysql2** - MySQL client
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **express-validator** - Input validation
- **cors** - CORS middleware
- **dotenv** - Environment variables
- **morgan** - HTTP request logger

## 🤝 Contributing

1. Fork the project
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

## 📄 License

MIT License
