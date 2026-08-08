# AGENTS.md (Workflow Context) — importexpress
> Generado: 2026-08-08 23:50:00 · Herramienta: opencode · Proyecto: /Users/pablohernandezcanelo/Documents/importexpress

## 🎯 Objetivo actual
Fix completo de la sección Pedidos — búsqueda de productos server-side con paginación al crear pedidos (antes solo cargaba 100 productos y mostraba 10 resultados client-side). Verificado con Playwright: "xiaomi" devuelve 22 productos de todas las categorías, "celular"/"samsung" multi-marca PASS. Pendiente: continuar reparación sección pedidos (zero bugs).

## 📍 Estado actual
  Branch: main · Working tree: LIMPIO (0 archivos sin commit)

  Últimos commits:
  195e6c6 feat(admin): búsqueda server-side con paginación en creación de pedidos
  5c40e80 feat(categorias): agregar soporte para categorías padre/hijo en tabla de productos
  35083f6 fix(dashboard): Total Productos filtra por periodo 7d/30d/90d + feat(admin): endpoint cambiar contrasena
  caa7f9f fix(security): restringir CORS a dominio real + limpiar header obsoleto x-register-secret
  e0b5ebf feat(security): OWASP A05 security headers + security.txt (Site24x7 79->90)
  a095a59 feat(admin): estilo home en tabla categorias + hover auto-expand subcategorias + animacion entrada
  d1ef045 chore(admin): renombrar botón 'Colapsar' por 'Contraer barra' en Sidebar
  316491e fix(bugs 04-ago): README URL + lint refs during render reportes
  65ef726 fix(hero): invalidar cache al crear/editar/eliminar banners (revalidateTag hero)
  454fa32 perf(hero): precarga banners server-side con cache + transformaciones Cloudinary f_auto/q_auto (carga instantanea del contenedor)

## 🧭 Próximo paso
Reparar sección pedidos: revisar/fixear demás deuda técnica detectada (pricing client/server duplicado, estado masivo, responsive). También hay un dato sucio en BD: Samsung Galaxy A37 con precio US$ 389.138,71 (costo mal cargado).

## ✅ Tareas activas
  [in_progress/high] Reparar sección pedidos hasta zero bugs/fix pendientes
  [completed] Fix buscador productos en creación de pedidos (server-side + paginación, admin=1, sin slice limit)
  [pending/high] Revisar deuda técnica pedidos: fetch duplicado, pricing duplicado (computeItemPricing client vs pricing.ts server), 22 useStates, dialog gigante

## ���� �� �� 🟡 Tareas pendientes (high priority)
  [pending/high] Tomar screenshots de pasos clave
  [pending/high] Reportar resultados PASS/FAIL con causa raíz y rutas de screenshots
  [pending/high] Verificar typecheck/lint
  [pending/high] Testear en local sin deploy: generar 6 tipos de slot y evaluar visualmente
  [pending/medium] Evaluar si vale la pena / definir precio (pendiente de decisión de Pablo)
  [pending/medium] Detallar plan de implementación: Más vendidos + KPIs pedidos + SEO + Trust badges + Export CSV

## ���� �� �� 🧱 Archivos clave / arquitectura
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
  scripts/migrate-to-pg.mjss
  scripts/restore-from-railway.mjs
  scripts/seed.ts
  src
  src/app
  src/components
  src/context
  src/generated
  src/lib
  src/types
  tsconfig.json
  tsconfig.tsbuildinfo

## ���� �� �� 🔐 Variables de entorno requeridas
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

## ���� �� �� 📦 Comandos útiles
  Scripts disponibles:
    dev: next dev
    build: next build
    start: next start
    lint: eslint
    postinstall: prisma generate
    seed: tsx prisma/seed.ts
    typecheck: npx tsc --noEmit

## ���� �� �� 🧠 Decisiones tomadas
  - Se adoptó estructura de categorías jerárquicas (padre/hijo) para mejor organización de productos
  - El buscador admin incluye búsqueda por rango de precios con tolerancia ±1 para manejar redondeos
  - La sincronización de URL mantiene estado de filtros, búsqueda y paginación al compartir enlaces