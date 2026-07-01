#!/bin/sh
set -e

if echo "$DATABASE_URL" | grep -q "^file:"; then
  if [ -d "/data" ]; then
    mkdir -p /data/prisma
    if [ ! -f "/data/prisma/dev.db" ]; then
      echo "→ Inicializando base de datos en volumen persistente..."
      cp ./prisma/dev.db /data/prisma/dev.db
    fi
    export DATABASE_URL="file:/data/prisma/dev.db"
  fi

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
fi

echo "→ Aplicando migraciones pendientes..."
./node_modules/.bin/prisma migrate deploy 2>&1 || echo "⚠️ Error en migrate deploy, continuando..."

echo "→ Migrando datos de SQLite a PostgreSQL si corresponde..."
node /app/scripts/migrate-to-pg.mjs 2>&1 || true

echo "→ Starting application..."
exec node server.js
