#!/bin/bash

# Script de démarrage qui applique les migrations avant de lancer l'app
# À utiliser avec CC_RUN_COMMAND

set -e

echo "🗄️ Synchronizing Prisma schema to staging database..."
cd packages/db-engage
npx prisma db push --skip-generate --accept-data-loss
cd ../..

echo "✅ Database schema synchronized"
echo ""
echo "🚀 Starting application..."

cd apps/engage
pnpm start
