# Restricción "3 ángulos por color" — Documento de Arquitectura

## Enunciado Formal

**Para que un producto tenga 3 ángulos distintos por color, se necesitan 3 fuentes de imagen oficiales distintas por color. Sin 3 fuentes, los ángulos se ven idénticos o se repite la misma imagen, perdiendo el propósito del carousel.**

This is a hard architectural constraint: the visual differentiation that the angle carousel provides relies on having three genuinely different images per color. If only 1 or 2 official sources exist per color, the "left" and "right" angles will either show the same image or a visually identical rendering, making the carousel feature meaningless.

---

## Limitación Técnica Raíz

- **Cloudinary muerta (401)**: No puede servir imágenes de respaldo ni imágenes generadas sintéticamente.
- **fal.ai bloqueada**: No está disponible IA sintética para generar ángulos faltantes.
- **Resultado**: Solo están disponibles las imágenes oficiales originales del fabricante, almacenadas en Supabase Storage. No hay capacidad de generar imágenes adicionales.

This means the architecture must work with what el fabricante provee oficialmente. No hay "trucos" de generación de imágenes posible en la pila actual.

---

## Alternativa Documentada: 2 ángulos + front

Cuando el fabricante provee solo 2 ángulos por color (front + left/right, o front + otro ángulo), se documenta como **excepción por producto** el uso de la siguiente estructura:

| Estructura | Descuento | Cuándo Aplicar |
|------------|-----------|----------------|
| **front + left/right** | 2 ángulos + front documentado | El fabricante provee exactamente 2 ángulos oficiales por color |
| **front solo** | 1 ángulo | El fabricante provee solo 1 imagen por color (mayoría de productos) |
| **3 ángulos reales** | 3 ángulos distintos | El fabricante provee 3+ imágenes oficiales distintas por color (67 productos) |

**Nota**: La excepción "2 ángulos + front" debe documentarse en el campo `specs` del producto o en un metadato adicional indicando: `angles: [front, left]` o `angles: [front, right]` con la justificación de que el fabricante no provee el tercer ángulo.

---

## Tabla de Productos por Categoría

El siguiente tabla categoriza los 303 productos con imágenes en Supabase según su capacidad para soportar ángulos:

| Categoría | Descripción | Cantidad de Productos | Ejemplos |
|-----------|-------------|----------------------|----------|
| **C1: 3 ángulos reales por color** | Tienen 3+ fuentes oficiales distintas por color. Pueden tener ángulos front/left/right verdaderamente distintos. | **67** | - `xiaomi-17t-5g-global-256gb` (negro: 3 images, violeta: 3 images)<br>- `smartwatch-garmin-forerunner-55` (negro: 3, blanco: 3, verde: 3)<br>- `jbl-go-5` (rojo: 3, blanco: 3, negro: 3, amarillo: 3) |
| **C2: 2 ángulos + front documentado** | El fabricante provee 2 ángulos por color. Se documenta como excepción por producto. Usa front + left/right. | **Pendiente de cálculo exacto** | Productos donde el fabricante provee front + un ángulo lateral, pero no los 3. Se documentará en specs. |
| **C3: 1 ángulo (front solo)** | Solo hay 1 imagen oficial por producto/color. El carousel mostrará solo el ángulo front. | **205** | La mayoría de productos single-image sin ángulos distintos |
| **C4: Bug sameUrlAllColors** | Todas las colores comparten la misma URL. No hay diferenciación posible por color. Se requiere corrección de base de datos. | **80** | `notebook-hp-chromebook-14a` (2 colors: both gris)<br>-`-armaf-odyssey-go-mango` (2 colors: both mango)<br>-`xiaomi-17t-5g` (6 images: 3 negro + 3 violeta, pero mismas URLs por color) |

**Resumen**: De 303 productos con imágenes:
- 67 (22%) pueden tener 3 ángulos reales por color
- ~80 (26%) tienen el bug `sameUrlAllColors` y requieren corrección
- ~205 (68%) se conformarán con 1 ángulo (front) o 2 + front documentado

---

## Plan de Trabajo Fase 3 Ajustado

El enfoque de la Fase 3 cambia de "ángulos por color" a **"ángulos por producto"** con las siguientes reglas:

### Regla Fundamental
**Máximo 1 imagen por color** en el carousel. Los ángulos front/left/right se comparten across colores, no son únicos por color.

### Flujo de Implementación

1. **Por producto** (no por color):
   - Revisar las imágenes oficiales disponibles para el producto completo
   - Asignar el ángulo **front** a la imagen principal (siempre disponible)
   - Asignar el ángulo **left** a una imagen lateral si el fabricante la provee
   - Asignar el ángulo **right** a una imagen lateral alternativa si el fabricante la provee
   - Si no hay 3 imágenes oficiales, documentar la excepción C2 (2 + front)

2. **Máximo 1 imagen por color**:
   - Cada color del producto debe usar como imagen principal la única imagen oficial disponible
   - No se pueden combinar imágenes de diferentes colores para crear ángulos
   - El carousel muestra 1 imagen por color con el ángulo asignado

3. **Ángulos front/left/right compartidos**:
   - El ángulo **front** es la imagen principal por defecto para todos los colores
   - El ángulo **left** y **right** son opcionales y se toman del fabricante si están disponibles
   - Si el fabricante provee 2 ángulos (front + left/right), se documenta como excepción C2 por producto
   - Si el fabricante provee 3+ ángulos, se usan como ángulos reales C1

4. **Manejo de excepciones**:
   - Productos C4 (sameUrlAllColors bug): Corregir en base de datos antes de asignar ángulos, o documentar como excepción
   - Productos C3 (1 ángulo): El carousel mostrará solo el ángulo front; los ángulos left/right aparecerán como el mismo front (estado aceptado)
   - Productos C2 (2 + front): Documentar en specs la excepción por producto

### Ejemplos Prácticos

| Producto | Colores | Imágenes Oficiales | Ángulos Asignados | Categoría |
|----------|---------|--------------------|-------------------|-----------|
| `xiaomi-17t-5g` | negro, violeta | negro: 3 images, violeta: 3 images | front/left/right distintos por color | C1 |
| `smartwatch-garmin-forerunner-55` | negro, blanco, verde | negro: 3, blanco: 3, verde: 3 | front/left/right distintos por color | C1 |
| `jbl-go-5` | rojo, blanco, negro, amarillo | rojo: 3, blanco: 3, negro: 3, amarillo: 3 | front/left/right distintos por color | C1 |
| `control-sony-dualsense` | 7 colores | front.png por color + color/{color}/front.png | front por color, left/right = front (mismo imagen) | C3 |
| `notebook-hp-chromebook` | gris | 2 images pero mismas URL por color | front solo (sameUrlAllColors bug) | C4 |
| `auricular-xiaomi-redmi-buds-6-play` | negro, rosa, celeste | 6 images: 3 negro + 3 rosa + 3 celeste (misma URL por color) | front solo (sameUrlAllColors) | C4 |
| `jbl-tune-520bt` | negro, blanco, azul | 9 images: 3 por color, URLs distintas por color | front + left/right documentado como excepción C2 por producto | C2 |

### Checklist de Validación por Producto

Antes de dar por definitivo el ángulo asignado por producto, verificar:

- [ ] ¿El producto tiene 3+ imágenes oficiales distintas por color? → C1: Usar ángulos front/left/right reales
- [ ] ¿El producto tiene 2 imágenes oficiales por color? → C2: Usar front + left/right, documentar excepción
- [ ] ¿El producto tiene 1 imagen oficial por color? → C3: Usar front solo, ángulos left/right = front (aceptado)
- [ ] ¿Todas los colores comparten la misma URL? → C4: Corregir bug sameUrlAllColors o documentar excepción

---

## Métricas y KPIs de la Fase 3

| Métrica | Objetivo | Estado Actual |
|---------|----------|---------------|
| Productos con 3 ángulos reales por color (C1) | 67 productos (22%) | Identificados |
| Productos con 2 + front documentado (C2) | Documentar por producto | Pendiente |
| Productos con 1 ángulo (front) (C3) | 205 productos (68%) | Confirmado |
| Productos con bug sameUrlAllColors (C4) | 0 no justificados | 80 identificados (pendiente corrección) |
| Cobertura de ángulos en catálogo | ≥ 80% de productos con ángulo asignado | En progreso |

---

## Decisiones Vinculantes para Próximas Fases

1. **La restricción de 3 ángulos por color es vinculante**: Fase 3 trabajará con ángulos por producto (máximo 1 imagen por color, ángulos front/left/right compartidos), NUNCA 3 imágenes distintas por color si no hay 3 fuentes oficiales.

2. **Web scraping descartado**: Como se aprendió en iteraciones anteriores, el web scraping no es fiable para obtener URLs de imágenes oficiales. Solo se usarán URLs provistas por el fabricante y almacenadas en Supabase.

3. **Cloudinary y fal.ai inaccesibles**: No habrá generación sintética de imágenes. El catálogo trabajará solo con imágenes oficiales existentes.

4. **Bug sameUrlAllColors debe corregirse**: Los 80 productos con este bug deben tener sus URLs corrigidas en la base de datos antes de que la Fase 3 entre en producción, o quedarse como excepción documentada C2 por producto.

5. **AGENTS.md handoff**: Al cierre, se actualizará con `handoff importexpress "pendientes críticos resueltos iter 1"` incluyendo la decisión de la restricción de 3 ángulos.