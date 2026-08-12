# AGENTS.md (Workflow Context) — importexpress
> Generado: 2026-08-11 23:01:35 · Herramienta: opencode · Proyecto: /Users/pablohernandezcanelo/Documents/importexpress

## 🎯 Objetivo actual
Testing completo para ImportExpress (Next.js 16 + TS estricto + Prisma/PostgreSQL).
1) INFRA TESTING (nueva): Vitest + @testing-library/react/jsdom (vitest.config.ts con alias @→./src y coverage v8; vitest.setup.ts con mocks matchMedia/getComputedStyle/getBoundingClientRect/animate). Playwright con 3 proyectos: chromium desktop, mobile-chrome (Pixel 5), mobile-safari (iPhone 12); webServer corre build de produccion con NEXTAUTH_URL (evita UntrustedHost). Scripts nuevos: typecheck, test, test:watch, test:ui, test:coverage, test:e2e, test:e2e:ui.
2) UNIT 117 pasando: CartContext 20, validators 44, flyToCart 13, CartDrawer 19, ProductCard 21.
3) E2E 36 pasando (12x3): homepage, catalogo, agregar al carrito, cantidad, eliminar, checkout (form + WhatsApp), vaciar, persistencia localStorage, FAB movil, admin (redirect login + form).
4) data-testid: CartDrawer (cart-overlay, close-drawer, decrease/increase-quantity, remove-item, quantity, product-placeholder), ProductCard (product-link, add-to-cart, color-swatch, product-placeholder; categoria UPPERCASE), Navbar (cart-trigger desktop + FAB movil).
5) Correcciones E2E: UntrustedHost (NEXTAUTH_URL), selectores a data-testid (titulo real Lo Pedis, Lo Tenes), tests adaptados a que el drawer NO se abre solo al agregar (flyToCart), :visible para desktop/movil (FAB solo con items).
6) Calidad: build OK, typecheck 0 errores, lint 0 errores (43 warnings previos).
7) Integracion: rebase sin conflictos con commit de Nicolas 8b0cec1 (categorias expanden colores + overlay sidebar); push a origin/main (8b0cec1..619bf2a).

## 📍 Estado actual
  Branch: main · Working tree: SUCIO (1 archivos)

  Cambios sin commit:
   AGENTS.md | 109 ++++++--------------------------------------------------------
   1 file changed, 9 insertions(+), 100 deletions(-)
   M AGENTS.md

  Últimos commits:
  619bf2a test(e2e): arreglar E2E de Playwright con selectores data-testid y vista responsive
  a5faf59 fix(test): fix lint error in CartDrawer test
  f0357f3 feat(test): add vitest + playwright testing infrastructure
  f2f75c8 docs: actualizar AGENTS.md — carrito FAB móvil completado, sin tareas activas
  8b0cec1 fix(public): categorias expanden colores (paridad con /productos) + overlay dropdown sidebar en home y productos

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
