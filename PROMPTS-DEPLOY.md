# ImportExpress - Deploy a Railway (con SQLite)

Ejecutar este prompt en opencode (VS Code en ~/Documents/importexpress).

---

**Pegar este prompt:**

```
Prepara el proyecto para deploy en Railway con SQLite persistente.

## Cambios necesarios:

### 1. Hacer configurable la DB URL

En `src/lib/prisma.ts`, reemplazar la URL hardcodeada por una variable de entorno:

```typescript
import { PrismaClient } from "@/generated/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db"

const prismaClientSingleton = () => {
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
  })
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

### 2. Agregar script postinstall en package.json

En `package.json`, agregar en `scripts`:

```json
"postinstall": "prisma generate && prisma migrate deploy"
```

### 3. Crear railway.json

Crear `railway.json` en la raíz:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 4. Crear Dockerfile (opcional, para más control sobre la DB)

Crear `Dockerfile` en la raíz:

```dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./

RUN mkdir -p /data && chown nextjs:nodejs /data

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV DATABASE_URL="file:/data/dev.db"

CMD ["node", "server.js"]
```

### 5. Configurar output standalone en next.config.ts

En `next.config.ts`, asegurarse de que tenga:

```typescript
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
}

export default nextConfig
```

### 6. Crear .env.production

Crear `.env.production`:

```
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="super-secret-key-importexpress-2024"
NEXTAUTH_URL="https://importexpress.up.railway.app"
```

### 7. Agregar .dockerignore

Crear `.dockerignore`:

```
.next
node_modules
.git
*.md
.env
.env.local
.env.production
```

### 8. Verificar que compile

Correr `npm run build` y asegurar que no haya errores.
No crear documentación ni archivos .md adicionales.
```

---

## Después de ejecutar el prompt

El otro opencode va a modificar los archivos. Después tenés que:

### 1. Subir a GitHub
```bash
cd ~/Documents/importexpress
git add .
git commit -m "deploy: ready for Railway"
git remote add origin https://github.com/TU_USUARIO/importexpress.git
git push -u origin main
```

### 2. Crear cuenta en Railway (railway.app)
- Registrate con GitHub
- Click "New Project" → "Deploy from GitHub repo"
- Conectá tu repo de ImportExpress
- En la pestaña "Variables", agregá:
  - `NEXTAUTH_SECRET` = `super-secret-key-importexpress-2024`
  - `NEXTAUTH_URL` = `https://importexpress.up.railway.app` (la URL que te dé Railway)
  - `DATABASE_URL` = `file:/data/dev.db`
- En la pestaña "Volumes", creá un volume mounteado en `/data`
- Hacé deploy

### 3. Primer acceso
- Railway te va a dar una URL tipo `https://importexpress.up.railway.app`
- Abrí `/login` y usá `admin@importexpress.com` / `admin123`

### 4. Cuando quieras migrar a Vercel + Supabase
Decime y te preparo los prompts para migrar a PostgreSQL.
