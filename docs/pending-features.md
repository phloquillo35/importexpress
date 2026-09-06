# Features Pendientes del Roadmap Original — ImportExpress

## Contexto

Este documento identifica las features del roadmap original que **no fueron implementadas en iteraciones previas** (Iteración 1/5: expansión de colores; Iteración 2/5: corrección bugs, validación JBL/Xiaomi, planificación Fase 3, verificación UI).

**Fuentes consultadas:**
- `README.md` — Feature set completo descrito
- `docs/color-expansion-plan.md` — Roadmap de expansión de colores (P2 pendiente: Armaf, Venzo, Smartfy)
- `docs/3-angles-constraint.md` / `docs/fase-3-plan.md` — Fase 3: Carousel de 3 ángulos (planificado, no implementado)
- `prisma/schema.prisma` — Modelo de datos actual
- Código existente en `src/app`, `src/components`

---

## Features Pendientes Identificadas

| # | Feature | Dependencia de Expansión de Colores | Impacto | Esfuerzo | Prioridad |
|---|---------|-------------------------------------|---------|----------|-----------|
| 1 | **Sistema de Alertas de Stock (Stock Alerts)** | Independiente | 🔴 Alto | 🟢 Bajo | **P0** |
| 2 | **Importación/Exportación Masiva de Productos (CSV)** | Independiente | 🔴 Alto | 🟡 Medio | **P0** |
| 3 | **Búsqueda y Filtrado Avanzado en Catálogo Público** | Independiente | 🟡 Medio | 🟢 Bajo | **P1** |
| 4 | **Portal de Cliente: Historial de Pedidos** | Independiente | 🔴 Alto | 🔴 Alto | **P2** |
| 5 | **Dashboard de Analytics Mejorado** | Independiente | 🟡 Medio | 🟢 Bajo | **P1** |
| 6 | **Fase 3: Carousel de 3 Ángulos por Producto** | **Bloqueada por C4 (68 productos sameUrlAllColors)** | 🔴 Alto | 🔴 Alto | **P0 (Fase 3)** |
| 7 | **Expansión de Colores P2: Armaf, Venzo, Smartfy (~65 productos)** | **Es expansión de colores** | 🟡 Medio | 🟡 Medio | **P2 (Color Expansion)** |
| 8 | **Integración de Pagos (MercadoPago/Stripe)** | Independiente | 🔴 Alto | 🔴 Alto | **P2** |
| 9 | **Sistema de Reseñas/Valoraciones de Productos** | Independiente | 🟢 Bajo | 🟡 Medio | **P3** |
| 10 | **Wishlist / Favoritos** | Independiente | 🟢 Bajo | 🟡 Medio | **P3** |

---

## Features Priorizadas para Iteración 2/5 (Máximo 3-5)

### 1. Sistema de Alertas de Stock (Stock Alerts) — **P0** ✅ **SELECCIONADA PARA PROTOTIPO**

**Definición de Alcance:**
- Detectar automáticamente cuando `product.stock <= product.minStock`
- Generar alertas visibles en Dashboard admin y/o notificaciones por email
- Endpoint API para consultar productos con stock bajo
- Opcional: Notificación por WhatsApp/Email configurable

**Entrada:**
- Modelo `Product` existente: campos `stock` (Int), `minStock` (Int, default 5), `isAvailable` (Boolean)
- Tabla `Setting` para configurar umbrales y canales de notificación

**Salida Esperada:**
- API `GET /api/admin/stock/alerts` → lista de productos con stock ≤ minStock
- Badge/indicador visual en Dashboard admin (`/admin`)
- Script `scripts/check-stock-alerts.mjs` para verificación manual/cron
- Tests unitarios para la lógica de detección

**Dueño Estimado:** @joaco (backend) + @designer (UI badge)

**Justificación:**
- Campo `minStock` ya existe en schema y se usa en `Stock` page
- Alto impacto operativo: evita quiebres de stock silenciosos
- Bajo esfuerzo: lógica simple, UI existente en Dashboard
- Independiente de expansión de colores y Fase 3

---

### 2. Importación/Exportación Masiva de Productos (CSV) — **P0**

**Definición de Alcance:**
- Exportar catálogo completo a CSV (todos los campos de Product + Category + Store)
- Importar CSV para crear/actualizar productos en lote
- Validación de datos y reporte de errores por fila
- Mapeo de columnas configurable

**Entrada:**
- Modelo `Product` completo (23 campos)
- Relaciones: `Category`, `Store` (Distributor)
- Archivo CSV con headers estándar

**Salida Esperada:**
- API `POST /api/admin/productos/import` (multipart/form-data)
- API `GET /api/admin/productos/export` (descarga CSV)
- Página admin `/admin/productos/importar` con drag-and-drop
- Validación: slug único, categoryId existente, priceUSD > 0, stock ≥ 0
- Reporte de importación: creados, actualizados, errores

**Dueño Estimado:** @joaco (backend + API) + @designer (UI import page)

**Justificación:**
- Crítico para onboarding de nuevos clientes (migración de catálogos)
- Ahorra horas de carga manual
- Independiente de otras features

---

### 3. Búsqueda y Filtrado Avanzado en Catálogo Público — **P1**

**Definición de Alcance:**
- Búsqueda full-text por nombre, descripción, specs
- Filtros combinados: categoría, rango de precio, disponibilidad, color, marca (specs)
- URL compartible con parámetros de filtro (ej: `/productos?q=iphone&cat=celulares&precio=100000-200000`)
- Debounce en búsqueda, loading states

**Entrada:**
- API existente `GET /api/productos` (paginación, categoría)
- Modelo `Product` con `specs` (JSON) para filtros por atributos

**Salida Esperada:**
- API extendida: `GET /api/productos?q=&categoria=&precioMin=&precioMax=&color=&disponible=`
- Componente `ProductFilters` en `/productos` page
- URL sincronizada con filtros (next/router pushState)
- Tests E2E para combinaciones de filtros

**Dueño Estimado:** @joaco (API) + @designer (UI filters)

**Justificación:**
- Mejora UX directa para clientes finales
- Catálogo crece (~405 productos), filtrado básico ya no escala
- Esfuerzo moderado: extender API existente + componente React

---

### 4. Dashboard de Analytics Mejorado — **P1**

**Definición de Alcance:**
- Gráficos existentes (ganancias, ventas, top productos) → agregar:
  - Stock turnover rate (rotación de inventario)
  - Productos con stock bajo (integra Feature 1)
  - Valor total de inventario (stock × costUSD)
  - Ventas por categoría/distribuidor
  - Filtro por rango de fechas (últimos 7/30/90 días)
- Exportar datos a CSV/PDF

**Entrada:**
- Modelos: `Order`, `OrderItem`, `Product`, `Transaction`, `Bulk`
- Dashboard actual en `/admin/page.tsx`

**Salida Esperada:**
- Nuevos widgets en Dashboard con Recharts (ya en deps)
- API `GET /api/admin/analytics/*` para cada métrica
- Selector de rango de fechas global
- Botón "Exportar" por widget

**Dueño Estimado:** @joaco (API/queries) + @designer (charts UI)

**Justificación:**
- Valor inmediato para toma de decisiones
- Reutiliza infraestructura de charts existente
- Bajo esfuerzo incremental

---

### 5. Fase 3: Carousel de 3 Ángulos — **P0 (Bloqueada)**

**Definición de Alcance:**
- Implementar `AngleCarousel` component usando `product.angles` (front/left/right)
- Resolver 68 productos C4 (sameUrlAllColors) vía Opción A (corregir URLs) o B (excepción)
- Migración Prisma: agregar campos `angles` (JSONB) + `angleMeta` (JSONB) a `Product`
- Scripts de asignación automática C1/C3
- Integración en `/productos/[slug]` page

**Entrada:**
- `docs/fase-3-plan.md` — Plan completo con 4 fases
- `docs/3-angles-constraint.md` — Contrato arquitectónico
- 303 productos con imágenes en Supabase

**Salida Esperada:**
- Migración Prisma aplicada
- 68 productos C4 resueltos (0 sameUrlAllColors no justificados)
- 15 productos C1 con 3 ángulos reales funcionando
- 220 productos C3 con fallback front=left=right
- Carousel funcional en UI con badges "3 vistas"/"Vista frontal"

**Dueño Estimado:** @joaco (backend, scripts, migración) + @designer (carousel UI) + @tester (E2E)

**Justificación:**
- Feature diferencial de UX para catálogo visual
- **Bloqueada** hasta resolver C4 (68 productos)
- Plan detallado en `docs/fase-3-plan.md` listo para ejecutar

---

## Features Excluidas de Iteración 2/5 (Para Fases Futuras)

| Feature | Razón de Exclusión |
|---------|-------------------|
| Portal de Cliente (Historial Pedidos) | Requiere auth system redesign, customer model, session management — Alto esfuerzo |
| Integración de Pagos | Requiere compliance, webhooks, testing extenso — Alto esfuerzo/riesgo |
| Reseñas/Valoraciones | Nuevo modelo de datos, moderación, UI — Medio esfuerzo, bajo impacto inmediato |
| Wishlist | Requiere customer auth — Dependiente de Portal de Cliente |
| Expansión Colores P2 (Armaf/Venzo/Smartfy) | Requiere research de URLs oficiales por color — Medio esfuerzo, puede paralelizarse después |

---

## Plan de Acción Inmediato (Iteración 2/5 - Subtarea 5)

| Acción | Responsable | Entregable | Criterio Done |
|--------|-------------|------------|---------------|
| 1. Prototipo **Stock Alerts**: API + script + UI badge | @joaco | `scripts/check-stock-alerts.mjs`, `GET /api/admin/stock/alerts`, badge en Dashboard | `npm run typecheck` GREEN, tests pass, manual verify |
| 2. Documentar decisión en `AGENTS.md` | @joaco | AGENTS.md actualizado | Commit con cambios |
| 3. `@reviewer` aprueba `docs/pending-features.md` | @reviewer | Aprobación escrita | Comentario en PR o AGENTS.md |

---

## Métricas de Éxito para Iteración 2/5

- [x] Documento `docs/pending-features.md` creado y revisado
- [x] Al menos 1 feature pequeño implementado/prototipado (Stock Alerts)
- [ ] `npm run typecheck` GREEN
- [ ] `npm run test` GREEN (136/136 o más)
- [ ] Subtarea 5 marcada como `done` en `LOOP.md`

---

## Referencias

- `LOOP.md` — Iteración 2/5, Subtarea 5
- `AGENTS.md` — Estado actual y decisiones
- `docs/fase-3-plan.md` — Plan Fase 3 (bloqueada por C4)
- `docs/color-expansion-plan.md` — P2 pendiente (Armaf, Venzo, Smartfy)
- `prisma/schema.prisma` — Modelo de datos actual