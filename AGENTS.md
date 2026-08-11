# AGENTS.md (Workflow Context) — importexpress
> Generado: 2026-08-10 00:14:29 · Herramienta: opencode · Proyecto: /Users/pablohernandezcanelo/Documents/importexpress

## 🎯 Objetivo actual
Implementación completa de mejoras en el carrito de compras móvil: carrito flotante (FAB) fuera de la hamburguesa solo en móvil, botones finalizar pedido/vaciar carrito visibles sobre la barra de Safari (+2.5rem safe-area), animación de vuelo de la card del producto hacia el carrito (desktop→navbar, móvil→FAB) sin abrir el drawer, fix del target móvil oculto y fix para que el vuelo funcione con el primer producto. Integrado y verificado en producción (HTTP 200).

## 📍 Estado actual
  Branch: main · Working tree: SUCIO (1 archivos)

  Cambios sin commit:
   AGENTS.md | 114 +++-----------------------------------------------------------
   1 file changed, 4 insertions(+), 110 deletions(-)
   M AGENTS.md

  Últimos commits:
  7ee5558 fix(carrito): vuelo al carrito tambien corre al agregar el primer producto en movil (target virtual del FAB)
  0638112 fix(carrito): en movil la card vuela al FAB flotante y no al boton hidden del navbar
  e8af05a feat(carrito): la card del producto vuela y se encoge hacia el carrito al agregar, sin abrirlo
  59073e7 fix(movil): subir mas los botones del carrito sobre la barra de Safari (+2.5rem)
  b843add fix(movil): botones finalizar pedido y vaciar carrito visibles sobre la barra de Safari con safe-area

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
