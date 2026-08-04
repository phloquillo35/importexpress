# AGENTS.md (Workflow Context) — importexpress
> Generado: 2026-08-04 20:09:07 · Herramienta: opencode · Proyecto: /Users/pablohernandezcanelo/Documents/importexpress

## 🎯 Objetivo actual
Fix sidebar Dashboard (dejaba de quedar fijado en azul en todas las secciones) + mejoras completas del buscador de productos (debounce, reset a página 1, contador de resultados, botón limpiar, sync URL, filtros combinados de categoría/disponibilidad/destacados) + fix conexión DB local a Postgres de Railway vía .env.local (el código usa PrismaPg pero .env apuntaba a SQLite). Verificado con Playwright: Test A sidebar PASS, Test B buscador desde página 12 PASS.

## 📍 Estado actual
  Branch: main · Working tree: SUCIO (7 archivos)

  Cambios sin commit:
   .../migration.sql                                  |   2 +-
   src/app/admin/productos/page.tsx                   | 200 +++++++++++++++++----
   src/app/api/productos/route.ts                     |  19 +-
   src/components/admin/Sidebar.tsx                   |   5 +-
   4 files changed, 187 insertions(+), 39 deletions(-)
   M prisma/migrations/20260730000000_add_subtotalARS_profitARS/migration.sql
   M src/app/admin/productos/page.tsx
   M src/app/api/productos/route.ts
   M src/components/admin/Sidebar.tsx
  ?? AGENTS.md
  ?? test-adapter.mjs
  ?? test-prisma-local.mjs

  Últimos commits:
  d017e4c feat(ui): detect color swatches independent of language (EN/ES/Apple)
  d877a69 feat(ui): reduce hero carousel autoplay interval to 3s
  6e32b4b fix(config): centralize production URL via NEXT_PUBLIC_URL
  cb10156 fix(email): enviar reportes via API REST Brevo (HTTPS 443) - Railway bloquea SMTP 587/465, fallback SMTP local
  4458df3 fix(email): eliminar cache del transporter SMTP + timeouts 15s - lee credenciales frescas cada envio

## ✅ Tareas activas
  [in_progress/high] Test B — Buscador: paginación, búsqueda desde páginas altas, filtros, limpiar
  [pending/medium] Tomar screenshots de pasos clave
  [pending/high] Reportar resultados PASS/FAIL con causa raíz y rutas de screenshots
  [in_progress/high] Delegar implementación flyers a JOACO (endpoint generate + template + admin UI)
  [pending/high] Verificar typecheck/lint
  [pending/high] Testear en local sin deploy: generar 6 tipos de slot y evaluar visualmente
  [pending/medium] Evaluar si vale la pena / definir precio (pendiente de decisión de Pablo)
  [in_progress/high] Auditar home móvil (Playwright 390×844): botones/CTAs que no se ven
  [pending/high] Auditar admin móvil: botones ocultos (necesita login o análisis de código responsive)
  [pending/medium] Detallar plan de implementación: Más vendidos + KPIs pedidos + SEO + Trust badges + Export CSV

## 🧭 Próximo paso
_(continuar donde quedó opencode. Si hay tareas in_progress arriba, retomar la primera.)_

## 🧱 Archivos clave / arquitectura
  .
.dockerignore
.env
.env.example
.env.local
AGENTS.md
components.json
Dockerfile
entrypoint.sh
eslint.config.mjs
next-env.d.ts
next.config.ts
package-lock.json
package.json
postcss.config.mjs
prisma
prisma.config.ts
prisma/dev.db
prisma/dev.db-shm
prisma/dev.db-wal
prisma/migrations
prisma/schema.prisma
prisma/seed.ts
public
public/images
public/logo.jpeg
public/logo.jpg
public/uploads
railway.json
README.md
scripts
scripts/backfill-total-ars.mjs
scripts/backup-imagenes.mjs
scripts/conteo-imagenes.mjs
scripts/diag-imagenes.mjs
scripts/healthcheck-imagenes.mjs
scripts/migrar-cloudinary.mjs
scripts/migrate-to-pg.mjs
scripts/restore-from-railway.mjs
scripts/seed.ts
src
src/app
src/components
src/context
src/generated
src/lib
src/types
test-adapter.mjs
test-prisma-local.mjs
tsconfig.json
tsconfig.tsbuildinfo

## 🔐 Variables de entorno requeridas
  Nombres de variables (sin valores):
    CRON_SECRET
    DATABASE_URL
    NEXT_PUBLIC_URL
    NEXTAUTH_SECRET
    NEXTAUTH_URL
    SMTP_FROM
    SMTP_HOST
    SMTP_PASS
    SMTP_PORT
    SMTP_USER
    UPLOADS_DIR

## 📦 Comandos útiles
  Scripts disponibles:
    dev: next dev
    build: next build
    start: next start
    lint: eslint
    postinstall: prisma generate
    seed: tsx prisma/seed.ts
    typecheck: npx tsc --noEmit

## 🧠 Decisiones tomadas
                _(decisiones de diseño/acuerdo a registrar aquí)_
