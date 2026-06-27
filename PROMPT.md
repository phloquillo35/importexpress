# PROYECTO: Lo Pedís, Lo Tenes (ImportExpress)

Ecommerce de importación desde Punta del Este (Uruguay) a Argentina.
Venta por catálogo + WhatsApp. Sin pasarela de pago.

## Stack

- **Framework**: Next.js 16 (Turbopack, App Router)
- **Language**: TypeScript
- **Database**: SQLite (`file:/data/prisma/dev.db` en Railway, `file:./prisma/dev.db` en local)
- **ORM**: Prisma 7 (`prisma-client`, output en `src/generated/`)
- **UI**: Tailwind CSS, shadcn/ui (custom), Lucide icons
- **Auth**: NextAuth con email/password (admin)
- **Forms**: react-hook-form
- **Email**: nodemailer (SMTP configurable desde Admin → Configuración)
- **Build**: `npm run build` (obligatorio antes de deployar)

## Deploy

- **URL**: https://importexpress-production.up.railway.app
- **Railway**: CLI linked, `railway up` para deployar (o `railway up --detach --yes` para unattended)
- **Admin login**: /login — admin@importexpress.com / admin123
- **Regla**: No deployar sin confirmación del cliente
- **Volumen**: `importexpress-volume` montado en `/data` (persistente)
- **Entrypoint**: `entrypoint.sh` — copia BD seed al volumen si no existe, setea `DATABASE_URL=file:/data/prisma/dev.db`

## Schema (prisma/schema.prisma)

Modelos principales:

- **Product**: id, name, slug, description, specs (JSON), images (JSON), stock, minStock, isAvailable, isFeatured, costUSDT (Float?), yoniEnabled (Boolean), hasFinancing (Boolean @default(false)), shippingCost (Float @default(0) — EN ARS), profitType (String @default("percentage") | "fixed_ars"), profitValue (Float @default(0) — EN ARS), finalPriceUSD (Float), finalPriceARS (Float), categoryId, distributorId
- **Category**: id, name, slug, description, image
- **Distributor**: id, name, contact, website, notes
- **Order**: id, clientName, clientSurname, clientPhone, clientEmail, storeName, clientContact, items (OrderItem[]), totalUSD, totalARS, status, notes
- **OrderItem**: id, orderId, productId, quantity, priceUSD, bulkId, trackingCode, shippingStatus, bulkType
- **Bulk**: id, type, courier, trackingCode, totalCostUSD, totalCostARS, date, status, notes, products (JSON), distributorId
- **Transaction**: id, type, concept, amountUSD, amountARS, date, notes
- **Setting**: id (String), key (String @unique), value (String)
- **Admin**: id, email, name, password

## Pricing Engine (`src/lib/pricing.ts`)

```typescript
PricingInput {
  costUSDT: number
  yoniEnabled: boolean
  shippingCost: number  // EN ARS
  profitType: "percentage" | "fixed_usdt" | "fixed_ars"
  profitValue: number
  exchangeRate: number  // USD→ARS general (para precio de referencia)
  usdtRate: number      // USDT→ARS específico
}

PricingResult {
  finalPriceUSD: number  // referencia (finalPriceARS / exchangeRate)
  finalPriceARS: number  // precio real de venta
}
```

Fórmula:
1. Base USDT = costUSDT + (yoni ? costUSDT × 0.25 : 0)
2. Base ARS = Base USDT × usdtRate
3. Subtotal ARS = Base ARS + shippingCost (ya en ARS)
4. Ganancia ARS = % sobre subtotalARS, o valor fijo ARS
5. finalPriceARS = subtotalARS + gananciaARS
6. finalPriceUSD = finalPriceARS / exchangeRate (redondeado)

## Settings configurables desde Admin → Configuración

| Key | Default | Uso |
|---|---|---|
| `exchange_rate` | 1350 | USD→ARS general, para precio USD de referencia |
| `usdt_rate` | 1400 | USDT→ARS, para convertir costos USDT a ARS en pricing |
| `business_name` | "Lo Pedís, Lo Tenes" | Nombre del negocio |
| `whatsapp` | 5491123456789 | Número de contacto |
| `instagram` | @lopedis_lotenes.01 | Usuario de Instagram |
| `smtp_host` | "" | Servidor SMTP para envío de reportes |
| `smtp_port` | 587 | Puerto SMTP |
| `smtp_user` | "" | Usuario SMTP |
| `smtp_pass` | "" | Contraseña SMTP |
| `smtp_from` | "" | Email remitente (si vacío, usa smtp_user) |

Auto-seed en primer GET /api/configuracion (crea admin default + settings).

## Archivos clave

| Archivo | Propósito |
|---|---|
| `src/lib/pricing.ts` | Motor de precios (fórmula completa) |
| `src/lib/email.ts` | Utilidad de envío de emails (lee SMTP de BD via Prisma) |
| `src/components/admin/ProductForm.tsx` | Form crear/editar producto con pricing preview |
| `src/components/admin/Sidebar.tsx` | Sidebar del admin (links navegación) |
| `src/app/admin/productos/[id]/editar/page.tsx` | Edit page |
| `src/app/admin/reportes/page.tsx` | Página para enviar reporte completo por email |
| `src/app/admin/configuracion/page.tsx` | Panel de configuración admin (incluye SMTP) |
| `src/app/api/productos/route.ts` | POST crear producto |
| `src/app/api/productos/[slug]/route.ts` | GET/PUT/DELETE producto |
| `src/app/api/configuracion/route.ts` | GET/PUT settings + auto-seed |
| `src/app/api/reportes/enviar/route.ts` | POST genera reporte completo y lo envía por email |
| `src/components/public/ProductCard.tsx` | Card producto público (badge financiación) |
| `src/components/public/Navbar.tsx` | Navbar público (usa CartContext) |
| `src/context/CartContext.tsx` | Context del carrito de compras |
| `prisma/schema.prisma` | Schema de base de datos |
| `entrypoint.sh` | Entrypoint Docker (persistencia BD en volumen /data) |

## Admin - Secciones

| Sección | Archivo | Funcionalidad |
|---|---|---|
| Dashboard | `/admin` | KPIs, gráficos, stock bajo, pedidos recientes |
| Productos | `/admin/productos` | Lista paginada, crear, editar, eliminar |
| Categorías | `/admin/categorias` | CRUD categorías |
| Stock | `/admin/stock` | Ajustar stock, importar Excel |
| Finanzas | `/admin/finanzas` | Transacciones, ingresos/egresos, gráfico |
| Pedidos | `/admin/pedidos` | CRUD pedidos, cambio de estado, tracking |
| Bultos | `/admin/bultos` | Envíos, asignación a orderItems |
| Importación | `/admin/importacion` | Lotes de importación |
| Reportes | `/admin/reportes` | Enviar reporte completo por email |
| Configuración | `/admin/configuracion` | Rates, contacto, SMTP |

## Bugs corregidos (sesión 26-Jun-2026)

### Persistencia de datos
- La BD estaba en `./prisma/dev.db` dentro del contenedor (efímero)
- Fix: `entrypoint.sh` detecta volumen `/data`, copia BD seed si no existe, setea `DATABASE_URL=file:/data/prisma/dev.db`
- Los datos ahora persisten entre deploys de Railway

### Stock
- `stock/page.tsx:96` — multiplicador `(add ? 1 : 1)` siempre daba 1, imposible restar
- Fix: eliminado el multiplicador muerto, se envía `parseInt(adjustQty)` directamente
- El backend ya manejaba `operation: "add" | "set"` correctamente

### Bultos (totalCostARS = 0)
- `bultos/page.tsx:178` — `"0"` es truthy como string, pero `parseFloat("0")` da `0` que es falsy → enviaba `null`
- `bultos/[id]/route.ts:51` — mismo falsy check, `0` se convertía a `null`
- Fix: ambos lados ahora checkean `!== "" && !== undefined` en vez de truthy/falsy

### Importación (cálculo de costo)
- `importacion/page.tsx:97` — fórmula incorrecta: `totalCostUSD * item.quantity / cart.length`
- Fix: simplificado a `parseFloat(form.totalCostUSD) || 0` (es un total único del lote)

### Categorías (slug auto-generation)
- `categorias/page.tsx:146-148` — doble `setForm` podía perder el name update por closure obsoleto
- Fix: un solo `setForm` funcional con `(prev) => ({ ...prev, name: val, slug: ... })`

### Error handling (8 páginas)
- stock, bultos (crear + editar), pedidos (crear + cambiar estado), finanzas, importacion (crear + cambiar estado)
- Antes: `throw new Error()` genérico
- Ahora: parsea `res.json()` y muestra `err.error` del server
- `.catch(() => {})` silenciosos reemplazados por `toast.error()`

### NEXTAUTH_URL
- `.env.production` apuntaba a `importexpress.up.railway.app` (URL vieja)
- Fix: `https://importexpress-production.up.railway.app`

## Resumen de precios (ProductForm)
- Eliminadas líneas de tipo de cambio USDT del resumen:
  - `→ Tipo cambio USDT: $1.400 ARS/USDT`
  - `Costo base en ARS: $0 ARS`
  - `Tipo de cambio ARS/USD: $1.350 | USDT: $1.400 ARS/USDT`
- Ahora solo muestra: Costo base USDT, Yoni (USDT), envío (ARS), ganancia, total ARS, total USD (ref)

## Reportes (nuevo)
- Ruta: `/admin/reportes`
- API: `POST /api/reportes/enviar` (requiere auth)
- Genera HTML con KPIs, productos por categoría, pedidos por estado, finanzas, stock bajo
- Envía al email del admin logueado
- Requiere SMTP configurado en Admin → Configuración
- Si no hay SMTP, muestra link a Configuración con advertencia

## Lo implementado hasta hoy

1. **Pricing con USDT configurable**: shipping en ARS, usdtRate separado de exchangeRate, ganancia sobre subtotal ARS.
2. **Fix edit producto**: defaultValues completos (costUSDT, yoniEnabled, hasFinancing, shippingCost, profitType, profitValue).
3. **Financiación por producto**: campo hasFinancing, badge en card y detalle público.
4. **Carrito**: CartContext + CartDrawer + envío a WhatsApp.
5. **Bulk system**: modelo Bulk, asignación a orderItems, trackingCode y status.
6. **Auto-seed**: primer GET /api/configuracion crea admin + settings por defecto.
7. **Video background**: comprimido 645KB, dark overlay en landing.
8. **Deploy Railway**: Dockerfile multi-stage, BD persistente en volumen /data.
9. **Reportes por email**: página + API con reporte completo + nodemailer + SMTP configurable.
10. **Fix persistencia BD**: entrypoint copia DB seed al volumen `/data` si no existe.
11. **Fix stock**: eliminado multiplicador muerto que impedía restar.
12. **Fix bultos totalCostARS=0**: falsy check corregido frontend + backend.
13. **Fix error handling**: todas las páginas admin muestran errores reales del server.
14. **Fix categorías slug**: doble setForm corregido.
15. **Fix NEXTAUTH_URL**: corregida URL de Railway.
16. **Resumen precios sin USDT**: eliminado detalle de tipo de cambio del pricing preview.

## Reglas para el agente

- Correr `npm run build` y probar en localhost antes de cada deploy.
- No deployar sin confirmación del cliente.
- Leer AGENTS.md para reglas de Next.js 16.
- Preferir editar archivos existantes antes de crear nuevos.
- No agregar comentarios al código a menos que se pida explícitamente.
- No crear archivos de documentación (*.md, README) a menos que se pida.
- Los settings SMTP se guardan en la BD (model Setting), no en env vars.
- La BD persiste en `/data/prisma/dev.db` en Railway (volumen).
