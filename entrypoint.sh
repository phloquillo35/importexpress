#!/bin/sh
set -e

if echo "$DATABASE_URL" | grep -q "^file:"; then
  if [ -d "/data" ]; then
    mkdir -p /data/prisma
    if [ -f "./prisma/dev.db" ]; then
      if [ ! -f "/data/prisma/dev.db" ]; then
        echo "→ Inicializando base de datos en volumen persistente..."
        cp ./prisma/dev.db /data/prisma/dev.db
      fi
      export DATABASE_URL="file:/data/prisma/dev.db"

      echo "→ Optimizando base de datos SQLite..."
      node -e "
      try {
        const Database = require('better-sqlite3');
        const db = new Database(process.env.DATABASE_URL.replace('file:', ''));
        db.pragma('journal_mode = WAL');
        db.pragma('synchronous = NORMAL');
        db.pragma('cache_size = -8000');
        db.pragma('temp_store = MEMORY');
        db.close();
        console.log('✓ PRAGMAs optimizados');
      } catch (e) {
        console.log('⚠️ No se pudo optimizar:', e.message);
      }
      " 2>&1 || true

      echo "→ Migrando datos de SQLite a PostgreSQL si corresponde..."
      rm -f /data/prisma/.migrated-to-pg
      node /app/scripts/migrate-to-pg.mjs 2>&1 || true
    fi
  fi
else
  echo "→ Limpiando datos SQLite stale (PostgreSQL detectado)..."
  rm -f /data/prisma/dev.db
  rm -f /data/prisma/.migrated-to-pg
fi

echo "→ Limpiando migrations fallidas previas..."
./node_modules/.bin/prisma migrate resolve --rolled-back 20260710000001_add_internal_number 2>&1 || true

echo "→ Aplicando migraciones pendientes..."
./node_modules/.bin/prisma migrate deploy 2>&1 || echo "⚠️ Error en migrate deploy, continuando..."

echo "→ Verificando columnas faltantes..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    await prisma.\$executeRawUnsafe('ALTER TABLE \"Order\" ADD COLUMN IF NOT EXISTS \"amountPaidARS\" DOUBLE PRECISION');
    console.log('✓ amountPaidARS column verified');
  } catch (e) {
    console.log('⚠️ amountPaidARS check:', e.message);
  }
  await prisma.\$disconnect();
})();
" 2>&1 || true

echo "→ Starting application..."
export HOSTNAME=0.0.0.0
exec node server.js
