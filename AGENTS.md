# AGENTS.md (Workflow Context) — importexpress
> Generado: 2026-09-10 01:30:00 · Herramienta: opencode · Proyecto: /Users/pablohernandezcanelo/Documents/importexpress

## 🎯 Objetivo actual
Fix del botón de visibilidad (ojito) en admin productos + fix del filtro de productos no disponibles en web pública + verificación del flujo de papelera (eliminar/restaurar)

## 📍 Estado actual
  Branch: main · Working tree: LIMPIO

  Últimos commits:
  efc622e fix(api): filtrar productos no disponibles en web pública
  9242b7a fix(admin): toggle visibilidad productos — PATCH dedicado + optimistic UI
  6333b73 fix(frontend): force-dynamic home, dedup hero banners, dynamic footer WhatsApp

## ✅ Tareas activas
  (sin tareas activas)

## 🧭 Próximo paso
_(continuar donde quedó opencode. Si hay tareas in_progress arriba, retomar la primera.)_

## 🧱 Archivos clave / arquitectura
  src/app/api/productos/route.ts — GET productos (filtro isAvailable para públicos)
  src/app/api/productos/[slug]/route.ts — PUT/PATCH/DELETE producto
  src/app/api/papelera/route.ts — GET elementos eliminados
  src/app/api/papelera/[model]/[id]/route.ts — PATCH restaurar / DELETE permanente
  src/app/admin/productos/page.tsx — Admin productos (handleDelete, handleToggleAvailability)
  src/components/papelera-modal.tsx — Modal de papelera con restaurar/eliminar
  src/lib/auth.ts — NextAuth JWT + requireRole()
  prisma/schema.prisma — Product model (isAvailable, deletedAt)

## 🔐 Variables de entorno requeridas
  Nombres de variables (sin valores):
    CRON_SECRET, DATABASE_URL, NEXT_PUBLIC_URL, NEXTAUTH_SECRET,
    NEXTAUTH_URL, SMTP_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER, UPLOADS_DIR

## 📦 Comandos útiles
    dev: next dev, build: next build, start: next start
    lint: eslint, typecheck: tsc --noEmit
    test: vitest run, test:e2e: playwright test
    postinstall: prisma generate, seed: tsx prisma/seed.ts

## 🧠 Decisiones tomadas (2026-09-10)

### Fix toggle visibilidad (ojito)
- **Causa raíz**: PUT endpoint ejecutaba recálculo completo de pricing en cada toggle, causando fallos silenciosos
- **Fix**: PATCH dedicado solo para `isAvailable` + optimistic UI (cambio inmediato, rollback si falla)
- **Archivos**: `src/app/api/productos/[slug]/route.ts` (+PATCH), `src/app/admin/productos/page.tsx` (handleToggleAvailability)

### Fix productos ocultos en web pública
- **Causa raíz**: API `/api/productos` no filtraba `isAvailable` para requests sin param `admin`
- **Fix**: `if (!admin && disponible !== "false") where.isAvailable = true` en route.ts línea 35
- **Resultado**: Web pública solo muestra productos con `isAvailable: true`; admin ve todos

### Verificación de papelera
- Flujo completo verificado: DELETE → papelera → RESTORE → visible en web pública
- Todos los tests pasaron (7/7)
