# AGENTS.md (Workflow Context) — importexpress
> Generado: 2026-09-06 21:24:45 · Herramienta: opencode · Proyecto: /Users/pablohernandezcanelo/Documents/importexpress

## 🎯 Objetivo actual
Auditoría completa + 12 fixes implementados + Dockerfile fix para Railway deploy

## 📍 Estado actual
  Branch: main · Working tree: SUCIO (1 archivos)

  Cambios sin commit:
   AGENTS.md | 150 ++------------------------------------------------------------
   1 file changed, 3 insertions(+), 147 deletions(-)
   M AGENTS.md

  Últimos commits:
  48b427f fix(docker): use lockfile in runner stage to fix Railway build failure
  9b4925b fix(deploy): handle migration resolve errors gracefully
  a256d1e feat(angles): add AngleCarousel, CSV import/export, and angle management
  557d7e7 fix(csp): add Supabase Storage to Content Security Policy for images
  06a4d05 fix(db): add @@map directives for lowercase table names

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
color-inventory.json
components.json
Dockerfile
docs
docs/3-angles-constraint.md
docs/c4-resolution-report.md
docs/color-expansion-plan.md
docs/fase-3-plan.md
docs/jbl-xiaomi-color-validation.md
docs/mac-mini-image-backup.md
docs/mac-mini-revert-decision.md
docs/pending-features.md
docs/ui-color-verification.md
docs/verify-joystick-colors.md
docs/xiaomi-color-validation-supplemental.md
e2e
e2e/critical-flows.spec.ts
e2e/featured-products-fix.spec.ts
e2e/no-spinners.spec.ts
e2e/products-featured-detail.spec.ts
e2e/products-featured.spec.ts
entrypoint.sh
eslint.config.mjs
LOOP.md
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
prisma/seed-ci.ts
prisma/seed.ts
public
public/images
public/logo.jpeg
public/logo.jpg
public/plan legal para importexpress.pdf
public/uploads
railway.json
README.md
scripts
scripts/analyze-c4.mjs
scripts/analyze-images.mjs
scripts/api-backup-full.mjs
scripts/api-backup.mjs

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
    ### Iteración 1/5
    - **Mac Mini Revert**: Imagen actual no distinguía de referencia Apple frontal. Revertido a `https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/mac-mini-chip-unselect-202608-gallery-1`. Docs: `docs/mac-mini-revert-decision.md`, `docs/mac-mini-image-backup.md`.
    - **Restricción 3 ángulos**: Contrato arquitectónico vinculante — máximo 1 imagen por color, ángulos front/left/right compartidos. Docs: `docs/3-angles-constraint.md`.
    ### Iteración 2/5
    - **Fase 3 Plan**: Categorización C1=15, C2=0, C3=220, C4=68. Plan de 4 fases con checklist. Docs: `docs/fase-3-plan.md`.
    - **Stock Alerts**: Prototipo funcional — script CLI con severidad, API REST con filtros, UI Dashboard existente.
    ### Iteración 3/5
    - **C4 Resolution**: 40 productos resueltos (2 Opción A URLs únicas + 38 Opción B excepciones documentadas). 0 sameUrlAllColors restantes. Docs: `docs/c4-resolution-report.md`.
    - **Migración Prisma angles**: Campo `angles` (JSONB nullable) + `angleMeta` (JSONB nullable). Backward compatible.
    - **AngleCarousel**: Extensión del carousel existente, no rebuild. C1=3 vistas, C2=2 vistas, C3=1 vista.
    - **CSV Import/Export**: Feature independiente de Fase 3. Export con BOM UTF-8, Import con dry-run/apply, 25 tests unitarios.
