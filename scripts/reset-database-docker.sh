#!/bin/bash

# Reset database in Docker container
# WARNING: This will delete all data!
# Usage: ./reset-database-docker.sh

echo "⚠️  WARNING: This will DROP the entire database and recreate it!"
echo "All data will be lost. Are you sure? (yes/no)"
read -r confirmation

if [ "$confirmation" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo "🗑️  Dropping and recreating database in Docker..."

# Run SQL commands in Docker container
docker exec -i finance-tracker-db mysql -uroot -proot123 << EOF
DROP DATABASE IF EXISTS finance_tracker;
EOF

if [ $? -ne 0 ]; then
    echo "❌ Failed to drop database!"
    exit 1
fi

echo "📝 Running schema from database.sql"
docker exec -i finance-tracker-db mysql -uroot -proot123 < ../src/config/database.sql

if [ $? -eq 0 ]; then
    echo "✅ Database reset successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Restart your backend container: docker-compose restart backend"
    echo "2. Register a new user or use existing credentials"
else
    echo "❌ Database reset failed!"
    exit 1
fi
