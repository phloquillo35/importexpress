# AGENTS.md (Workflow Context) — importexpress
> Generado: 2026-08-17 22:40:44 · Herramienta: opencode · Proyecto: /Users/pablohernandezcanelo/Documents/importexpress

## 🎯 Objetivo actual
Jornada UI/UX homepage + admin: grid mobile 2 cols, título sin wrap, botones visibles, layout vertical; admin: columna Fecha creación, 13 cols fit sin scroll horizontal; cursor pointer en todos clickables; fixes: cards duplicadas, botones ocultos, truncación con tooltip. 10 commits, lint/typecheck/build OK.

## 📍 Estado actual
  Branch: main · Working tree: SUCIO (1 archivos)

  Cambios sin commit:
   AGENTS.md | 125 +-------------------------------------------------------------
   1 file changed, 2 insertions(+), 123 deletions(-)
   M AGENTS.md

  Últimos commits:
  38d83a1 fix(admin/productos): reduce column widths further for sidebar collapsed view
  27096f6 fix(admin/productos): responsive column widths with truncation for long names
  ef11f28 fix(admin/productos): fixed column widths to fit all 13 columns on desktop
  4d08fcc feat(admin/productos): add 'Fecha creación' column to products table
  2302f93 fix(ui): add cursor-pointer to remaining interactive elements

## ✅ Tareas activas
  (sin tareas activas)

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
e2e
e2e/critical-flows.spec.ts
e2e/featured-products-fix.spec.ts
e2e/no-spinners.spec.ts
e2e/products-featured-detail.spec.ts
e2e/products-featured.spec.ts
entrypoint.sh
eslint.config.mjs
next-env.d.ts
next.config.ts
package-lock.json
package.json
playwright-report
playwright-report/index.html
playwright.config.ts
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
scripts/diag-categorias.mjs
scripts/diag-imagenes.mjs
scripts/healthcheck-imagenes.mjs
scripts/limpiar-categorias.mjs
scripts/limpiar-trailing-spaces.mjs
scripts/migrar-cloudinary.mjs
scripts/migrate-to-pg.mjs
scripts/restore-from-railway.mjs
scripts/seed.ts
src
src/app
src/components
src/context
src/generated
src/hooks
src/lib
src/types

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
    typecheck: tsc --noEmit
    test: vitest run
    test:watch: vitest
    test:ui: vitest --ui
    test:coverage: vitest run --coverage
    test:e2e: playwright test
    test:e2e:ui: playwright test --ui
    postinstall: prisma generate
    seed: tsx prisma/seed.ts
    typecheck: npx tsc --noEmit

## 🧠 Decisiones tomadas
                  _(decisiones de diseño/acuerdo a registrar aquí)_
