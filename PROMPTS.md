# ImportExpress - Prompts para opencode

Ejecutar en orden en la carpeta `~/Documents/importexpress` con opencode.

⚠️ **Ya ejecuté las Fases 1, 2 y 3 parcialmente.** El proyecto tiene:
- Next.js + dependencias instaladas ✅
- Prisma con SQLite + migración ✅
- Auth (NextAuth) configurado ✅
- Login page ✅
- Admin Layout + Sidebar ✅
- Dashboard básico ✅
- Subida de imágenes local ✅

**Empezá desde la FASE 4.**

---

## FASE 4: Catálogo Público

**Pegar este prompt en opencode:**

```
Completa las páginas públicas del catálogo de ImportExpress. Diseño oscuro con colores oro (#F59E0B) y púrpura (#8B5CF6).

Ya existe un layout público en src/app/(public)/layout.tsx con Navbar y Footer. Completá las páginas faltantes:

1. src/app/(public)/page.tsx (Home):
   - Hero section: "Todo lo que necesitás, importado para vos" con CTA ir a productos
   - Grid de categorías (fetch desde /api/categorias)
   - Sección "Productos Destacados" (isFeatured = true, fetch desde /api/productos?destacados=true)
   - Sección "¿Cómo funciona?" en 3 pasos
   - Diseño Bento Grid, hover scale(1.02), glass effect

2. src/app/(public)/productos/page.tsx:
   - Banner con título "Catálogo de Productos"
   - Grid de ProductCard
   - Barra de búsqueda (consume /api/productos?search=xxx)
   - Sidebar con filtros de categoría
   - Paginación (20 por página)
   - Loader mientras carga

3. src/app/(public)/productos/[slug]/page.tsx:
   - Detalle del producto (fetch /api/productos/[slug])
   - Imagen, nombre, precio USD + ARS
   - Especificaciones técnicas (tabla)
   - Badge de disponibilidad
   - Botón "Consultar por WhatsApp" (wa.me con mensaje predefinido)
   - Productos relacionados

4. src/app/(public)/categorias/[slug]/page.tsx:
   - Header de categoría
   - Grid de productos filtrados

5. src/app/(public)/como-funciona/page.tsx:
   - 3 pasos explicando el proceso de importación
   - FAQ con acordeón (usar datos mockeados)

6. src/app/(public)/contacto/page.tsx:
   - Links a WhatsApp e Instagram
   - Info de contacto

7. Crear src/components/public/ProductCard.tsx:
   - Card con imagen, nombre, precio USD + ARS, badge categoría
   - Link a /productos/[slug]
   - Hover: scale(1.02) + glow

Todas las páginas usan fetch a /api/* para obtener datos, con loading states y manejo de errores.
```

---

## FASE 5: API de Productos + Categorías

**Pegar este prompt:**

```
Crea los endpoints de API para productos y categorías. Usar prisma de @/lib/prisma y la carpeta src/app/api/ que ya existe con las subcarpetas creadas.

1. src/app/api/productos/route.ts:
   - GET: listar productos con filtros (categoriaId, search, destacado, disponible)
   - Soporte para paginación (?page=1&limit=20)
   - POST: crear producto (body JSON con name, slug, description, specs, images, priceUSD, costUSD, stock, minStock, isAvailable, isFeatured, categoryId, distributorId)
   - El slug se genera automáticamente si no se provee

2. src/app/api/productos/[slug]/route.ts:
   - GET: obtener producto por slug (incluir categoría y distribuidor)
   - PUT: actualizar producto
   - DELETE: eliminar producto

3. src/app/api/categorias/route.ts:
   - GET: listar todas las categorías
   - POST: crear categoría

4. src/app/api/categorias/[id]/route.ts:
   - PUT: actualizar categoría
   - DELETE: eliminar categoría (verificar que no tenga productos asociados)

5. src/app/api/productos/[slug]/route.ts usar params como Promise (Next.js 16):
```typescript
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
}
```

Prisma import: import { prisma } from "@/lib/prisma"
El modelo Product tiene images como Json (array de strings: ["/uploads/img1.jpg", "/uploads/img2.jpg"])
```

---

## FASE 6: CRUD Admin Productos + Categorías

**Pegar este prompt:**

```
Crea las páginas de administración de productos y categorías.

1. src/app/admin/categorias/page.tsx:
   - "use client"
   - Tabla de categorías (fetch GET /api/categorias)
   - Botón "Nueva categoría" que abre Dialog con formulario
   - Por cada fila: botones editar y eliminar
   - Usar componentes shadcn (Table, Dialog, Button, Input)
   - Colores: fondo #0F172A, texto blanco, acento verde #22C55E

2. src/app/admin/productos/page.tsx:
   - "use client"
   - Tabla de productos con columnas: nombre, categoría, precio USD, stock, disponible
   - Barra de búsqueda
   - Botón "Nuevo producto" → link a /admin/productos/nuevo
   - Por cada fila: botones editar y eliminar
   - Paginación client-side

3. src/app/admin/productos/nuevo/page.tsx:
   - "use client"
   - Formulario completo con react-hook-form:
     - Nombre (genera slug)
     - Descripción (textarea)
     - Especificaciones (agregar/quitar pares key-value)
     - Imágenes (subir a /api/upload, mostrar previews)
     - Precio USD, Costo USD
     - Stock, Stock mínimo
     - Toggles: Disponible, Destacado
     - Select: Categoría, Distribuidor (fetch de las APIs)
   - Validación básica
   - POST a /api/productos al submit

4. src/app/admin/productos/[id]/editar/page.tsx:
   - Mismo formulario que nuevo pero precargado con datos del producto (GET /api/productos/[slug])
   - PUT a /api/productos/[slug] al submit

Todas las páginas deben tener loading states y toasts de éxito/error (usar sonner).
```

---

## FASE 7: Stock + Excel + API endpoints faltantes

**Pegar este prompt:**

```
Crea el módulo de stock y el resto de APIs.

APIs:

1. src/app/api/stock/route.ts:
   - GET: devolver todos los productos con su stock
   - POST: ajustar stock (body: { productId, quantity, operation: "add" | "set" })

2. src/app/api/stock/import/route.ts:
   - POST: recibe FormData con archivo Excel (.xlsx)
   - Usar librería xlsx para parsear
   - Detectar columnas: nombre, precio, stock, categoría
   - Crear o actualizar productos
   - Devolver resumen: creados, actualizados, errores

3. src/app/api/transacciones/route.ts:
   - GET: listar transacciones con filtros (tipo, fecha desde/hasta)
   - POST: crear transacción

4. src/app/api/distribuidores/route.ts:
   - GET: listar distribuidores
   - POST: crear distribuidor

5. src/app/api/pedidos/route.ts:
   - GET: listar pedidos
   - POST: crear pedido

6. src/app/api/importacion/route.ts:
   - GET: listar lotes
   - POST: crear lote

7. src/app/api/configuracion/route.ts:
   - GET: obtener configuraciones (exchange_rate, business_name, whatsapp, instagram)
   - PUT: actualizar configuraciones

Páginas admin de stock:

8. src/app/admin/stock/page.tsx:
   - "use client"
   - Tabla con todos los productos y su stock
   - Barra de búsqueda
   - Color coding: verde (stock > minStock*2), amarillo (stock <= minStock*2), rojo (stock <= minStock)
   - Modal "Ajustar stock" para cada producto
   - Sección "Importar Excel" con drag & drop zone

Usar params como Promise en Next.js 16 (await params).
```

---

## FASE 8: Finanzas + Dashboard completo + Órdenes

**Pegar este prompt:**

```
Completa el dashboard y crea las páginas de finanzas, pedidos, distribuidores, importación y configuración.

1. src/app/admin/finanzas/page.tsx:
   - "use client"
   - Resumen del mes: ingresos, egresos, balance
   - Tabla de transacciones con filtros (tipo, fecha)
   - Botón "Nueva transacción" (modal con tipo, concepto, monto USD, monto ARS, fecha)
   - Gráfico de línea con evolución últimos 6 meses (usar Recharts)

2. src/app/admin/pedidos/page.tsx:
   - "use client"
   - Tabla de pedidos con estados (badges: pending=amarillo, ordered=azul, arrived=verde, delivered=gris, cancelled=rojo)
   - Filtro por estado
   - Modal crear pedido: buscar producto, cantidad, nombre cliente, contacto
   - Click en pedido para ver detalle y cambiar estado

3. src/app/admin/distribuidores/page.tsx:
   - "use client"
   - Tabla de distribuidores
   - Modal crear/editar

4. src/app/admin/importacion/page.tsx:
   - "use client"
   - Lista de lotes de importación
   - Modal crear lote: seleccionar distribuidor, productos con cantidades
   - Cambiar estado del lote (al marcar "received", actualizar stock automáticamente)

5. src/app/admin/configuracion/page.tsx:
   - "use client"
   - Formulario: tipo de cambio USD→ARS, nombre del negocio, WhatsApp, Instagram, email
   - Guardar en Settings vía API

6. Mejorar src/app/admin/page.tsx (Dashboard):
   - Agregar gráfico de donut: productos por categoría
   - Agregar últimos pedidos
   - Agregar últimas transacciones
   - Selector de período (7d, 30d, 90d)

Crear archivos API faltantes ([id] variants para PUT/DELETE) según sea necesario.
```

---

## FASE 9: Detalles finales

**Pegar este prompt:**

```
Pulido final y detalles.

1. Verificar que el botón de WhatsApp flotante funcione en todas las páginas públicas:
   - Agregar en (public)/layout.tsx un link flotante a wa.me

2. SEO:
   - Agregar metadata en (public)/layout.tsx
   - title: "ImportExpress - Productos importados desde Punta del Este"
   - description: "Todo lo que necesitás, importado para vos. Electrónica, bicicletas, celulares y más."

3. Tipo de cambio dinámico:
   - En ProductCard y detalle de producto, leer exchange_rate de /api/configuracion
   - Calcular priceARS = priceUSD * exchangeRate

4. Loading states:
   - Todos los fetch deben tener loading skeleton
   - Usar shadcn Skeleton component

5. Error states:
   - Manejar errores de fetch con mensajes amigables

6. Responsive:
   - Verificar que todo se vea bien en mobile
   - Navbar colapsable (ya está)
   - Tablas con overflow-x en mobile
   - Grid: 1 col mobile, 2 tablet, 3-4 desktop

7. Verificar que compile con npm run build (puede haber errores de tipos)

No crear documentación ni archivos .md.
```
