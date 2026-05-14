#!/usr/bin/env bash
# ─── GrwFit — First-time setup ────────────────────────────────────────────────
# Run this script once after cloning to set up the project.

set -euo pipefail

echo "🏋️  GrwFit Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌  Node.js 20+ required"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌  pnpm required: npm install -g pnpm"; exit 1; }

NODE_VER=$(node --version | tr -d 'v' | cut -d. -f1)
if [ "$NODE_VER" -lt 20 ]; then
  echo "❌  Node.js 20+ required (found $(node --version))"; exit 1
fi

echo "✓  Node $(node --version)"
echo "✓  pnpm $(pnpm --version)"
echo ""

# 2. Copy env files if they don't exist
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "✓  Created .env — fill in DATABASE_URL and other secrets"
else
  echo "✓  .env exists"
fi

if [ ! -f "apps/api/.env" ]; then
  cp apps/api/.env.example apps/api/.env
  echo "✓  Created apps/api/.env"
fi

echo ""

# 3. Install dependencies
echo "📦  Installing dependencies (this may take a few minutes)..."
pnpm install
echo "✓  Dependencies installed"
echo ""

# 4. Build shared packages
echo "🔨  Building shared packages..."
pnpm --filter @grwfit/shared-types build
echo "✓  @grwfit/shared-types built"
echo ""

# 5. Generate Prisma client
echo "🗄️   Generating Prisma client..."
pnpm db:generate
echo "✓  Prisma client generated"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅  Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env and set DATABASE_URL to your Supabase connection string"
echo "  2. Run:  pnpm db:migrate:dev    — to run Prisma migrations"
echo "  3. Run:  psql \$DATABASE_URL -f packages/db/prisma/migrations/0001_rls_setup.sql"
echo "           (or run in Supabase SQL editor)"
echo "  4. Run:  pnpm db:seed           — to seed demo data"
echo "  5. Run:  pnpm dev               — to start all apps"
echo ""
echo "Ports:"
echo "  API     → http://localhost:3000  (Swagger: /api/v1/docs)"
echo "  Staff   → http://localhost:3001"
echo "  Admin   → http://localhost:3002"
echo "  Members → http://localhost:3003"
echo "  Sites   → http://localhost:3004"
echo ""
