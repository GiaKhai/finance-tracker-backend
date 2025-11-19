# Finance Tracker Backend

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Run:
```bash
# Development
npm run dev

# Production
npm start
```

## Environment Variables

- `NODE_ENV`: production or development
- `PORT`: Server port (default: 5000)
- `DB_HOST`: MySQL host
- `DB_USER`: MySQL user
- `DB_PASSWORD`: MySQL password
- `DB_NAME`: Database name
- `DB_PORT`: MySQL port (default: 3306)
- `JWT_SECRET`: Secret key for JWT
- `JWT_EXPIRE`: JWT expiration time

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `GET /api/wallets` - Get wallets
- `GET /api/transactions` - Get transactions
- `GET /api/categories` - Get categories

## Deploy

### Railway
```bash
railway login
railway init
railway up
```

### Render
1. Connect GitHub repository
2. Set environment variables
3. Deploy

### Docker
```bash
docker build -t finance-backend .
docker run -p 5000:5000 finance-backend
```
