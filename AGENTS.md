# AGENTS.md (Workflow Context) — importexpress
> Generado: 2026-08-15 21:32:05 · Herramienta: opencode · Proyecto: /Users/pablohernandezcanelo/Documents/importexpress

## 🎯 Objetivo actual
Jornada ImportExpress: flujo de pedidos por WhatsApp de punta a punta + mejoras en pedidos, productos y bultos.

- Pagina de producto individual: formulario Consultar por WhatsApp (nombre, telefono, direccion) que genera mensaje con el mismo formato que el carrito (producto + link + total + datos) y abre WhatsAppAgentSelector (f2d9b44).
- Admin pedidos: boton WhatsApp al cliente, filtros avanzados y soporte color/storage (60978db); fix de migracion color/storage para crear pedidos y buscador unico con select de estado (92d1cfb); truncar nombre de producto en tabla (36e4b6a).
- Paginacion de productos: salto directo a numero de pagina (bc93fe6), reorden con numeros y selector Ir a (ab50f5e), total de paginas en admin (4f270a9) y selector de pagina en el sitio publico (57f0e82).
- Bultos: fix de regresion que impedia cargar productos pendientes + clasificacion automatica chico/grande + numero de pedido (381e01f); card de detalle clickeable y ordenada + tracking del courier editable con auto en camino y notificacion (7c5f4ce); truncar nombres largos (4fee969); scroll interno en card de edicion (d023115).
- NUEVO lector de pedidos de WhatsApp en admin (e1fcd9a): boton Pegar pedido + dialogo con textarea y Detectar pedido, preview con cliente y productos En catalogo / Sin match, y Precargar pedido que rellena formulario + carrito y abre el modal Nuevo pedido. Email agregado en CartDrawer y pagina de producto.
- Fixes del lector: matchear por slug y nombre normalizado (9d32afa); precargar TODOS los productos con updates funcionales del carrito, causa raiz: cierre desactualizado de cart en addToCart (0e4fe8e); parser que detecta mensajes SIN saltos de linea porque WhatsApp colapsa los saltos al pegar (a602190).

Verificado: typecheck OK, lint 0 errores, tests 136 pass (7 archivos), build OK. 16 commits a main. Working tree limpio.

## 📍 Estado actual
  Branch: main · Working tree: SUCIO (1 archivos)

  Cambios sin commit:
   AGENTS.md | 125 ++++++--------------------------------------------------------
   1 file changed, 11 insertions(+), 114 deletions(-)
   M AGENTS.md

  Últimos commits:
  a602190 fix(whatsapp-reader): parsear pedidos pegados sin saltos de línea (una sola línea)
  0e4fe8e fix(pedidos): precargar todos los productos del lector con updates funcionales del carrito
  9d32afa fix(whatsapp-reader): matchear productos por slug y nombre normalizado con parser tolerante a formatos reales
  e1fcd9a feat(pedidos): lector de pedidos de WhatsApp con pegado + preview y precarga del formulario
  d023115 fix(bultos): contener card de edición con scroll interno (evita desborde con muchos productos)

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
