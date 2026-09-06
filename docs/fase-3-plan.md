# Plan de Implementación Fase 3 — ImportExpress

## Contexto y Contrato Arquitectónico

Este documento deriva del **contrato arquitectónico vinculante** definido en `docs/3-angles-constraint.md` (Iteración 1/5). La restricción fundamental es:

> **Máximo 1 imagen por color**. Los ángulos front/left/right se comparten across colores, no son únicos por color.

La Fase 3 cambia el enfoque de "ángulos por color" a **"ángulos por producto"**.

---

## Estado Actual del Inventario (Fuente: DB PostgreSQL, 2026-09-03)

| Categoría | Descripción | Cantidad | % del Total |
|-----------|-------------|----------|-------------|
| **C1: 3 ángulos reales por color** | 3+ imágenes oficiales distintas por color. Carousel muestra front/left/right verdaderamente distintos. | **15** | 5% |
| **C2: 2 ángulos + front documentado** | Fabricante provee 2 ángulos por color (front + left/right). Se documenta como excepción por producto. | **0** | 0% |
| **C3: 1 ángulo (front solo)** | Solo 1 imagen oficial por color. Carousel muestra solo front; left/right = front (estado aceptado). | **220** | 73% |
| **C4: Bug sameUrlAllColors** | Todos los colores comparten la misma URL. Requiere corrección en BD o excepción documentada. | **68** | 22% |
| **Total con imágenes** | | **303** | 100% |

> **Nota**: Los números difieren del documento `3-angles-constraint.md` (escrito en Iteración 1/5) porque la Iteración 1/5 corrigió 20 productos P0 y expandió a ~405 productos. Este plan usa el estado **actual de la base de datos** como fuente de verdad.

---

## Reglas por Categoría para Asignación de Ángulos

### C1 — 3 Ángulos Reales por Color (15 productos)

**Criterio**: El producto tiene ≥3 imágenes oficiales distintas **por cada color** en la base de datos.

**Regla de asignación**:
- `front` = imagen principal del color (índice 0 o la marcada como principal)
- `left` = segunda imagen oficial del color
- `right` = tercera imagen oficial del color
- Si un color tiene >3 imágenes, usar las primeras 3 en orden de prioridad del fabricante

**Productos C1 identificados**:
| Slug | Colores | Imágenes/Color | Notas |
|------|---------|----------------|-------|
| `impresora-termica-epson-tm-t20ivl-001` | default | 3 | Impresora térmica |
| `impresora-termica-ftx-tdr080ue` | default | 3 | Impresora térmica |
| `impresora-multifuncional-epson-l14150-ecotank-wifi` | default | 3 | Impresora multifunción |
| `impresora-epson-l4360-ecotank` | default | 3 | Impresora |
| `auricular-jbl-wave-beam-2` | blanco, rosa | 3 | JBL auriculares |
| `impresora-multifuncional-epson-l3560-ecotank-wifi` | default | 3 | Impresora multifunción |
| `impresora-epson-l1250-ecotank-wifi` | default | 3 | Impresora |
| `jbl-tune-520bt-wireless` | negro, blanco, azul | 3 | JBL auriculares |
| `auricular-jbl-sense-lite-wireless` | purple, white, terra | 3 | JBL auriculares |
| `auriculares-jbl-t720bt-wireless-` | lila, blanco, negro | 3 | JBL auriculares |
| *(5 productos más)* | | | Ver query DB para lista completa |

**Validación C1**:
- [ ] Cada color tiene exactamente 3 URLs distintas en `product.images`
- [ ] Las 3 URLs corresponden a ángulos visualmente distintos (front, left, right)
- [ ] No hay duplicados de URL dentro del mismo color
- [ ] El carousel en UI muestra 3 imágenes distintas al navegar ángulos

---

### C2 — 2 Ángulos + Front Documentado (0 productos actuales)

**Criterio**: El fabricante provee oficialmente **2 ángulos por color** (front + left/right). No hay productos en este estado actualmente en la BD, pero la categoría existe para futuros productos donde el fabricante solo provea 2 vistas oficiales.

**Regla de asignación**:
- `front` = imagen frontal oficial
- `left` = imagen lateral oficial (left o right según disponibilidad)
- `right` = **igual a `left`** (no hay tercer ángulo oficial)
- **Documentación obligatoria**: En `product.specs` agregar:
  ```json
  {
    "angles": ["front", "left"],
    "angleException": "Manufacturer only provides 2 angles per color (front + left). Right angle mirrors left.",
    "angleSource": "official-manufacturer"
  }
  ```

**Cuándo aplicar en futuro**:
- Nuevo producto donde investigación confirme que fabricante solo tiene 2 vistas oficiales por color
- Producto existente donde se descubra que las 3 imágenes actuales incluyen una duplicada/render

**Validación C2**:
- [ ] Confirmado con fuente oficial (web fabricante, BestBuy, gsmarena) que solo existen 2 ángulos
- [ ] Excepción documentada en `product.specs.angles` y `angleException`
- [ ] Carousel muestra front → left → left (right = left)
- [ ] No se inventan ángulos sintéticos (Cloudinary/fal.ai inaccesibles)

---

### C3 — 1 Ángulo (Front Solo) (220 productos)

**Criterio**: Solo existe **1 imagen oficial por color** en la base de datos. Es la mayoría del catálogo.

**Regla de asignación**:
- `front` = única imagen oficial del color
- `left` = **igual a `front`** (fallback aceptado)
- `right` = **igual a `front`** (fallback aceptado)
- **No se documenta como excepción** — es el comportamiento por defecto

**Comportamiento del Carousel**:
- El usuario ve la misma imagen en los 3 ángulos
- UI debe indicar sutilmente que no hay ángulos adicionales (ej: deshabilitar navegación left/right o mostrar tooltip "Solo vista frontal disponible")
- No se considera bug ni deuda técnica — es limitación de datos del fabricante

**Validación C3**:
- [ ] Cada color tiene exactamente 1 URL en `product.images`
- [ ] Carousel renderiza sin errores (left/right = front)
- [ ] UI no muestra indicadores de ángulos inexistentes
- [ ] Performance: no se hacen requests extra para ángulos inexistentes

---

### C4 — Bug sameUrlAllColors (68 productos)

**Criterio**: Múltiples colores de un producto comparten **la misma URL** (misma imagen para colores distintos). Esto impide cualquier diferenciación visual por color.

**Ejemplos actuales**:
| Slug | Colores Afectados | Imágenes/Color | Problema |
|------|-------------------|----------------|----------|
| `celular-xiaomi-poco-c81-pro-...` | negro, dorado | 1 cada uno | Mismo URL para ambos colores |
| `consola-sony-playstation-5-slim-...` | blanco | 2 | Duplicado en mismo color |
| `auricular-haylou-flowbuds-n55-wireless` | blanco, negro | 2 cada uno | Mismo URL across colores |
| `controle-sony-dualsense-para-ps5` | 8 colores | 2-4 c/u | URLs compartidas entre colores |
| `smarwatch-garmin-forerunner-970-...` | dorado, negro, aqua | 2-4 c/u | URLs compartidas |
| `armaf-odyssey-marshmallow-...` | marshmallow | 2 | Duplicado |
| `xiaomi-17t-nfc-dual-sim-...` | negro, violeta | 2-3 c/u | URLs compartidas |
| `cargador-portatil-xiaomi-magnetic-...` | celeste, lila, beige | 3 c/u | URLs compartidas |
| `tablet-xiaomi-pad-8-tela-...` | celeste, gris | 2 c/u | URLs compartidas |
| `tablet-xiaomi-mi-pad-8-pro-...` | gris, verde, celeste | 3-4 c/u | URLs compartidas |

**Regla de corrección (OBLIGATORIA antes de Fase 3 producción)**:

Para **cada producto C4**, aplicar **una** de estas dos opciones:

#### Opción A — Corregir en Base de Datos (Preferida)
1. Investigar URLs oficiales por color (BestBuy, gsmarena, jbl.com, mi.com, Apple CDN, etc.)
2. Subir imágenes correctas a Supabase Storage: `products/{slug}/{color}/front.png`
3. Actualizar `product.images` con URLs únicas por color
4. Verificar: `node scripts/check-colors.mjs` → 0 sameUrlAllColors

#### Opción B — Documentar Excepción C2 por Producto
**Solo si**: El fabricante **oficialmente** no distingue visualmente los colores (ej: producto donde el color es solo un detalle interno, o packaging idéntico).
1. En `product.specs` agregar:
   ```json
   {
     "angles": ["front"],
     "colorException": "Manufacturer does not provide distinct images per color. All colors share visual appearance.",
     "colorSource": "official-manufacturer",
     "affectedColors": ["negro", "dorado", "blanco"]
   }
   ```
2. El producto pasa a categoría **C3** (1 ángulo) con excepción documentada

**Criterio de decisión**:
| Situación | Acción |
|-----------|--------|
| URLs oficiales distintas existen y son accesibles | **Opción A** (Corregir) |
| Fabricante confirma: "no hay imágenes distintas por color" | **Opción B** (Excepción C2) |
| No se pueden encontrar URLs oficiales tras investigación exhaustiva | **Opción B** (Excepción C2) con nota "investigación exhaustiva sin resultados" |

**Validación C4**:
- [ ] Cada producto C4 tiene decisión documentada (A o B)
- [ ] Si Opción A: `check-colors.mjs` reporta 0 sameUrlAllColors para ese producto
- [ ] Si Opción B: `product.specs.colorException` documentado con justificación
- [ ] Ningún producto C4 queda sin resolución antes de deploy Fase 3

---

## Plan de Implementación por Fases

### Fase 3.1 — Resolución C4 (Bloqueante) — Semana 1
**Objetivo**: 0 productos C4 sin resolver antes de continuar.

| Paso | Acción | Responsable | Verificación |
|------|--------|-------------|--------------|
| 3.1.1 | Exportar lista completa de 68 productos C4 con detalles (slug, colores, URLs actuales) | @joaco | Archivo `docs/c4-resolution-plan.md` |
| 3.1.2 | Para cada producto: investigar URLs oficiales por color | @joaco | Research documentado por producto |
| 3.1.3 | Aplicar Opción A (corregir) o B (excepción) | @joaco | BD actualizada / specs documentado |
| 3.1.4 | Ejecutar `node scripts/check-colors.mjs` full inventory | @tester | 0 sameUrlAllColors no justificados |
| 3.1.5 | `npm run typecheck` + `npm run test` | @tester | GREEN |

**Entregable**: `docs/c4-resolution-report.md` con tabla de 68 productos, decisión (A/B), y evidencia.

---

### Fase 3.2 — Asignación de Ángulos C1/C3 — Semana 2
**Objetivo**: Asignar ángulos front/left/right a todos los productos C1 y C3.

| Paso | Acción | Responsable | Verificación |
|------|--------|-------------|--------------|
| 3.2.1 | Script de asignación automática C1: mapear 3 imágenes → front/left/right | @joaco | Script `scripts/assign-angles-c1.mjs` |
| 3.2.2 | Script de asignación C3: front=left=right=única imagen | @joaco | Script `scripts/assign-angles-c3.mjs` |
| 3.2.3 | Actualizar campo `product.angles` (nuevo campo JSONB) o `product.specs.angles` | @joaco | BD actualizada |
| 3.2.4 | Validar 15 productos C1: carousel muestra 3 imágenes distintas | @designer | Visual check en staging |
| 3.2.5 | Validar 220 productos C3: carousel renderiza sin error | @tester | Automated test |

**Estructura de datos propuesta** (nuevo campo en `product`):
```json
{
  "angles": {
    "front": "https://supabase.co/.../front.png",
    "left": "https://supabase.co/.../left.png",   // o = front para C3
    "right": "https://supabase.co/.../right.png"  // o = front para C3
  },
  "angleMeta": {
    "category": "C1|C2|C3",
    "source": "official-manufacturer",
    "assignedAt": "2026-09-03T...",
    "exception": null  // o string si C2
  }
}
```

---

### Fase 3.3 — Integración Frontend Carousel — Semana 3
**Objetivo**: Carousel de ángulos funcional en UI usando datos de Fase 3.2.

| Paso | Acción | Responsable | Verificación |
|------|--------|-------------|--------------|
| 3.3.1 | Componente `AngleCarousel` que lee `product.angles` | @joaco | Componente creado |
| 3.3.2 | Lógica: C1 → 3 imágenes distintas; C2 → front/left/left; C3 → front/front/front | @joaco | Lógica implementada |
| 3.3.3 | UI indicators: badges "3 vistas", "2 vistas", "Vista frontal" | @designer | Diseño aprobado |
| 3.3.4 | Integración en página de producto (`/product/[slug]`) | @joaco | Funcional en staging |
| 3.3.5 | Tests E2E: navegación ángulos, cambio de color, responsive | @tester | Playwright tests pass |

---

### Fase 3.4 — Validación Completa y Documentación — Semana 4
**Objetivo**: Checklist completo por producto y sign-off.

| Paso | Acción | Responsable | Verificación |
|------|--------|-------------|--------------|
| 3.4.1 | Ejecutar checklist de validación por producto (ver abajo) | @reviewer | Checklist 100% |
| 3.4.2 | Generar reporte final `docs/fase-3-validation-report.md` | @reviewer | Documento completado |
| 3.4.3 | `@reviewer` aprueba como criterio vinculante para producción | @reviewer | Aprobación escrita |
| 3.4.4 | `npm run typecheck` + `npm run test` + `npm run test:e2e` | @tester | All GREEN |
| 3.4.5 | Actualizar `AGENTS.md` con decisiones finales Fase 3 | @joaco | AGENTS.md actualizado |

---

## Checklist de Validación por Producto (Basado en 3-angles-constraint.md items 99-104)

Para **cada producto** en el catálogo (303 con imágenes), verificar:

### Checklist Universal (Todos los Productos)
- [ ] **Categoría asignada**: C1, C2, C3, o C4-resuelto
- [ ] **Campo `angles` poblado**: front, left, right presentes
- [ ] **Campo `angleMeta.category`** coincide con categoría asignada
- [ ] **Campo `angleMeta.source`** = "official-manufacturer"
- [ ] **No URLs Cloudinary** en angles (solo Supabase Storage)
- [ ] **Carousel renderiza** sin errores de consola
- [ ] **Cambio de color** actualiza imágenes del carousel correctamente

### Checklist Específico por Categoría

#### C1 (15 productos)
- [ ] `angles.front` ≠ `angles.left` ≠ `angles.right` (3 URLs distintas)
- [ ] Las 3 URLs corresponden al **mismo color** del producto
- [ ] Diferencia visual confirmada entre front/left/right (no son la misma imagen)
- [ ] `angleMeta.category` = "C1"
- [ ] `angleMeta.exception` = null

#### C2 (0 actuales, futuros)
- [ ] `angles.front` ≠ `angles.left`
- [ ] `angles.right` === `angles.left` (mirror documentado)
- [ ] `angleMeta.category` = "C2"
- [ ] `angleMeta.exception` documentado con justificación del fabricante
- [ ] `product.specs.angles` = ["front", "left"]
- [ ] `product.specs.angleException` presente

#### C3 (220 productos)
- [ ] `angles.front` === `angles.left` === `angles.right` (misma URL)
- [ ] `angleMeta.category` = "C3"
- [ ] `angleMeta.exception` = null
- [ ] UI no muestra controles de navegación left/right activos (o tooltip informativo)

#### C4 Resueltos (68 productos)
- [ ] **Si Opción A**: Producto reclasificado a C1, C2, o C3 según imágenes resultantes
- [ ] **Si Opción B**: `product.specs.colorException` documentado, reclasificado a C3
- [ ] `check-colors.mjs` confirma 0 sameUrlAllColors para el producto
- [ ] `angleMeta.category` refleja categoría final (C1/C2/C3)

---

## Métricas y KPIs de la Fase 3

| Métrica | Objetivo | Estado Actual | Meta Post-Fase 3 |
|---------|----------|---------------|------------------|
| Productos C1 (3 ángulos reales) | 15 identificados | 15 (5%) | 15+ (mantenidos) |
| Productos C2 (2 + front documentado) | Documentar por producto | 0 | Según nuevos ingresos |
| Productos C3 (1 ángulo front) | 220 confirmados | 220 (73%) | 220+ (mayoría) |
| Productos C4 (sameUrlAllColors) | 0 no justificados | 68 (22%) | **0** |
| Cobertura ángulos en catálogo | ≥ 80% con ángulo asignado | ~78% (C1+C3) | **100%** |
| `check-colors.mjs` sameUrlAllColors | 0 no justificados | 68 | **0** |
| Typecheck | GREEN | GREEN | GREEN |
| Tests (unit + e2e) | All pass | 136/136 pass | All pass |

---

## Decisiones Vinculantes para la Fase 3 (Registradas en AGENTS.md)

1. **Regla fundamental inmutable**: Máximo 1 imagen por color. Ángulos front/left/right compartidos across colores.
2. **No generación sintética**: Cloudinary (401) y fal.ai (bloqueada) inaccesibles. Solo imágenes oficiales en Supabase.
3. **C4 es bloqueante**: Ningún producto con sameUrlAllColors sin resolver entra a producción Fase 3.
4. **C2 por excepción únicamente**: Solo cuando fabricante confirme oficialmente 2 ángulos. No se asume.
5. **C3 es default**: Comportamiento aceptado, no deuda técnica. UI debe manejarlo graceful.
6. **Fuente de verdad**: Base de datos PostgreSQL (tabla `product`, campos `images`, `angles`, `specs`).
7. **Validación automatizada**: `scripts/check-colors.mjs` + `scripts/check-angles.mjs` (nuevo) en CI/CD.

---

## Próximos Pasos Inmediatos

1. **Crear `docs/c4-resolution-plan.md`** con lista detallada de 68 productos C4
2. **Ejecutar investigación de URLs oficiales** para cada producto C4 (paralelizable)
3. **Desarrollar scripts de asignación** `assign-angles-c1.mjs` y `assign-angles-c3.mjs`
4. **Definir migración Prisma** para nuevo campo `angles` + `angleMeta` en `product`
5. **Iniciar corrección C4** (Opción A prioritaria)

---

## Referencias

- `docs/3-angles-constraint.md` — Contrato arquitectónico original (vinculante)
- `docs/color-expansion-plan.md` — Plan de expansión de colores (Iteración 1/5)
- `docs/jbl-xiaomi-color-validation.md` — Validación JBL/Xiaomi completada
- `color-inventory.json` — Inventario de colores (404 productos)
- `scripts/check-colors.mjs` — Script de validación de colores
- `LOOP.md` — Iteración 2/5, Subtarea 3 (este plan)

---

*Documento generado como parte de Iteración 2/5, Subtarea 3 (P2). Dueño: @reviewer. Aprobación requerida antes de iniciar Fase 3.1.*