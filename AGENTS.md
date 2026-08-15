# AGENTS.md (Workflow Context) — importexpress
> Generado: 2026-08-15 14:22:49 · Herramienta: opencode · Proyecto: /Users/pablohernandezcanelo/Documents/importexpress

## 🎯 Objetivo actual
Modificado flujo WhatsApp en página de producto individual: botón 'Consultar por WhatsApp' ahora abre formulario para datos de usuario (nombre, teléfono, dirección) y genera mensaje idéntico al formato del carrito (producto + link + total + datos usuario) antes de abrir WhatsAppAgentSelector. Verificado: typecheck, build, lint (0 errores), tests 117 pass. Push: f2d9b44

## 📍 Estado actual
  Branch: main · Working tree: SUCIO (1 archivos)

  Cambios sin commit:
   AGENTS.md | 116 ++------------------------------------------------------------
   1 file changed, 2 insertions(+), 114 deletions(-)
   M AGENTS.md

  Últimos commits:
  f2d9b44 feat(product): add WhatsApp consultation form with user data (mirrors cart flow)
  f1bc018 docs: actualizar AGENTS.md — cierre de día 11-ago-2026 (testing completo)
  619bf2a test(e2e): arreglar E2E de Playwright con selectores data-testid y vista responsive
  a5faf59 fix(test): fix lint error in CartDrawer test
  f0357f3 feat(test): add vitest + playwright testing infrastructure

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
test-results
test-results/.last-run.json
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
