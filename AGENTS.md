# AGENTS.md (Workflow Context) — importexpress
> Generado: 2026-08-08 11:00:00 · Herramienta: opencode · Proyecto: /Users/pablohernandezcanelo/Documents/importexpress

## ���� �� �� 🎯 Objetivo actual
Mejoras completas del buscador de productos (verificar Test B: paginación, búsqueda desde páginas altas, filtros, limpiar) + implementación de flyers delegada a JOACO + auditorías móviles home y admin.

## ���� �� �� 📍 Estado actual
  Branch: main · Working tree: LIMPIO (0 archivos sin commit)

  Últimos commits:
  5c40e80 feat(categorias): agregar soporte para categorías padre/hijo en tabla de productos
  35083f6 fix(dashboard): Total Productos filtra por periodo 7d/30d/90d + feat(admin): endpoint cambiar contrasena
  caa7f9f fix(security): restringir CORS a dominio real + limpiar header obsoleto x-register-secret
  e0b5ebf feat(security): OWASP A05 security headers + security.txt (Site24x7 79->90)
  a095a59 feat(admin): estilo home en tabla categorias + hover auto-expand subcategorias + animacion entrada
  d1ef045 chore(admin): renombrar botón 'Colapsar' por 'Contraer barra' en Sidebar
  316491e fix(bugs 04-ago): README URL + lint refs during render reportes
  65ef726 fix(hero): invalidar cache al crear/editar/eliminar banners (revalidateTag hero)
  454fa32 perf(hero): precarga banners server-side con cache + transformaciones Cloudinary f_auto/q_auto (carga instantanea del contenedor)

## ���� �� �� 🧭 Próximo paso
Continuar con Test B — Buscador: completar validación de paginación, búsqueda desde páginas altas, filtros combinados y botón limpiar.

## ���� � �� ✅ Tareas activas
  [in_progress/high] Test B — Buscador: paginación, búsqueda desde páginas altas, filtros, limpiar
  [in_progress/high] Delegar implementación flyers a JOACO (endpoint generate + template + admin UI)
  [in_progress/high] Auditar home móvil (Playwright 390×844): botones/CTAs que no se ven
  [in_progress/high] Auditar admin móvil: botones ocultos (necesita login o análisis de código responsive)

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