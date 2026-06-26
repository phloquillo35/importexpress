#!/bin/sh
set -e

export PATH="./node_modules/.bin:$PATH"

echo "→ Running database migrations..."
prisma migrate deploy

echo "→ Seeding defaults..."
tsx prisma/seed.ts

echo "→ Starting application..."
exec node server.js
