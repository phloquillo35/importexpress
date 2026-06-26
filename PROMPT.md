# PROYECTO: Lo Pedís, Lo Tenes (ImportExpress)

Ecommerce de importación desde Punta del Este (Uruguay) a Argentina.
Venta por catálogo + WhatsApp. Sin pasarela de pago.

## Stack

- **Framework**: Next.js 16 (Turbopack, App Router)
- **Language**: TypeScript
- **Database**: SQLite (`file:./prisma/dev.db`, efímera en Railway)
- **ORM**: Prisma 7 (`prisma-client`, output en `src/generated/`)
- **UI**: Tailwind CSS, shadcn/ui (custom), Lucide icons
- **Auth**: NextAuth con email/password (admin)
- **Forms**: react-hook-form
- **Build**: `npm run build` (obligatorio antes de deployar)

## Deploy

- **URL**: https://importexpress-production.up.railway.app
- **Railway**: CLI linked, `railway up` para deployar
- **Admin login**: /login — admin@importexpress.com / admin123
- **Regla**: No deployar sin confirmación del cliente

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

Auto-seed en primer GET /api/configuracion (crea admin default + settings).

## Archivos clave

| Archivo | Propósito |
|---|---|
| `src/lib/pricing.ts` | Motor de precios (fórmula completa) |
| `src/components/admin/ProductForm.tsx` | Form crear/editar producto con pricing preview |
| `src/app/admin/productos/[id]/editar/page.tsx` | Edit page (fijar valores de pricing en defaultValues) |
| `src/app/api/productos/route.ts` | POST crear producto (lee usdt_rate de DB) |
| `src/app/api/productos/[slug]/route.ts` | GET/PUT/DELETE producto (PUT lee usdt_rate de DB) |
| `src/app/api/configuracion/route.ts` | GET/PUT settings + auto-seed |
| `src/app/admin/configuracion/page.tsx` | Panel de configuración admin |
| `src/components/public/ProductCard.tsx` | Card producto público (badge financiación) |
| `src/app/(public)/productos/[slug]/page.tsx` | Detalle producto público (badge financiación) |
| `prisma/schema.prisma` | Schema de base de datos |

## Lo implementado hasta hoy

1. **Pricing con USDT configurable**: shipping en ARS, usdtRate separado de exchangeRate, ganancia sobre subtotal ARS. Configurable desde Admin → Configuración.
2. **Fix edit producto**: la edit page ahora incluye costUSDT, yoniEnabled, hasFinancing, shippingCost, profitType, profitValue en defaultValues (antes se perdían al editar).
3. **Financiación por producto**: campo hasFinancing (boolean), checkbox en form, badge "3 o 6 cuotas sin interés" en card y detalle público.
4. **Carrito**: CartContext + CartDrawer + envío a WhatsApp.
5. **Bulk system**: modelo Bulk, asignación a orderItems, trackingCode y status.
6. **Auto-seed**: primer GET /api/configuracion crea admin, exchange_rate=1350, usdt_rate=1400, y settings por defecto.
7. **Video background**: comprimido 645KB, dark overlay en landing.
8. **Deploy Railway**: Dockerfile multi-stage con BD efímera.

## Reglas para el agente

- Correr `npm run build` y probar en localhost antes de cada deploy.
- No deployar sin confirmación del cliente.
- No tocar el admin panel sin que el cliente lo pida.
- Leer AGENTS.md para reglas de Next.js 16.
- Preferir editar archivos existantes antes de crear nuevos.
- No agregar comentarios al código a menos que se pida explícitamente.
- No crear archivos de documentación (*.md, README) a menos que se pida.
