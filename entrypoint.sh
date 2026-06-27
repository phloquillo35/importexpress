#!/bin/sh
set -e

if [ -d "/data" ]; then
  mkdir -p /data/prisma
  if [ ! -f "/data/prisma/dev.db" ]; then
    echo "→ Inicializando base de datos en volumen persistente..."
    cp ./prisma/dev.db /data/prisma/dev.db
  fi
  export DATABASE_URL="file:/data/prisma/dev.db"
fi

echo "→ Starting application..."
exec node server.js
