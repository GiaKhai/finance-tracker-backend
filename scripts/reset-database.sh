#!/bin/bash

# Reset database - Drop and recreate from schema
# WARNING: This will delete all data!
# Usage: ./reset-database.sh

echo "⚠️  WARNING: This will DROP the entire database and recreate it!"
echo "All data will be lost. Are you sure? (yes/no)"
read -r confirmation

if [ "$confirmation" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

# Load environment variables from .env if it exists
if [ -f ../.env ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
fi

# Database credentials
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-}
DB_NAME=${DB_NAME:-finance_tracker}

echo "🗑️  Dropping database: $DB_NAME"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "DROP DATABASE IF EXISTS $DB_NAME;"

if [ $? -ne 0 ]; then
    echo "❌ Failed to drop database!"
    exit 1
fi

echo "📝 Running schema from database.sql"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" < ../src/config/database.sql

if [ $? -eq 0 ]; then
    echo "✅ Database reset successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Restart your backend server"
    echo "2. Register a new user or use existing credentials"
else
    echo "❌ Database reset failed!"
    exit 1
fi
