#!/bin/bash

# Script de configuration de la base de données Studio
set -e

DB_URL="postgresql://usdepzjwjyreyu6guhhp:JtPmr8pFwHOzDCaThjEA@boesqxm6eftogcpogwr9-postgresql.services.clever-cloud.com:5419/boesqxm6eftogcpogwr9"

echo "🔍 Vérification de l'extension pgvector..."

# Vérifier pgvector
if docker run --rm postgres:16 psql "$DB_URL" -c "SELECT * FROM pg_extension WHERE extname='vector';" 2>/dev/null | grep -q "vector"; then
    echo "✅ Extension pgvector activée"
else
    echo "❌ Extension pgvector NON activée"
    echo ""
    echo "📋 Actions à effectuer manuellement:"
    echo "1. Aller sur https://console.clever-cloud.com"
    echo "2. Sélectionner l'add-on PostgreSQL 'postgresql_3dceac01-74c1-4f00-a2d8-dbe8449b2307'"
    echo "3. Cliquer sur 'Console'"
    echo "4. Exécuter: CREATE EXTENSION IF NOT EXISTS vector;"
    echo ""
    echo "Puis relancer ce script."
    exit 1
fi

echo ""
echo "🔧 Génération du client Prisma Studio..."
cd packages/db-studio
npm run db:generate

echo ""
echo "🗄️ Synchronisation du schéma avec db push..."
DATABASE_URL="$DB_URL" npx prisma db push

echo ""
echo "✅ Configuration de la base de données Studio terminée!"
echo ""
echo "Vous pouvez maintenant déployer:"
echo "  clever deploy --alias studio-staging --force"
