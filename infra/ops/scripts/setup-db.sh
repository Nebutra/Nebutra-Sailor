#!/bin/bash
set -e

# ============================================
# Database Setup Script
# ============================================

echo "🗄️  Setting up database..."

# Check required env vars
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is not set"
  exit 1
fi

# Enable extensions
echo "📦 Enabling extensions..."
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Run Prisma migrations
echo "🔄 Running Prisma migrations..."
pnpm db:migrate

# Apply RLS policies
echo "🔒 Applying RLS policies..."
psql "$DATABASE_URL" -f "$(dirname "$0")/../database/policies/rls.sql"

echo "✅ Database setup complete!"
