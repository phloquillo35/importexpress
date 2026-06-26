# Prompt para retomar — Lo Pedís, Lo Tenes (ex ImportExpress)

**Repo:** `github.com/phloquillo35/importexpress` — branch `main`
**Último commit:** `158b421` — fix: copy seeded database from deps to builder so runner has tables at DATABASE_URL path
**Deploy:** Railway (URL pendiente de verificar)
**Admin:** admin@importexpress.com / admin123

## Comandos clave

| Acción | Comando |
|---|---|
| Build y preview local | `npm run build && npm run start` |
| Deployar | `railway up --detach` |
| Logs | `railway logs` |
| Comando remoto | `railway ssh -- "comando"` |

## Reglas estrictas

1. **Siempre** correr `npm run build` y probar en localhost antes de deployar.
2. No deployar sin confirmación del cliente.
3. Railway CLI linked con volumen de datos incluido.
4. No tocar nada del admin panel a menos que el cliente lo pida.

## Estado actual

### ✅ Logrado hasta hoy

- **Pricing engine:** `calculateFinalPrice()` con costUSDT, Yoni toggle, shippingCost, profit (% o fijo), y conversión ARS
- **Formulario producto:** Sección de costos admin, resumen de precios en vivo, Selector tipo ganancia
- **API productos:** POST/PUT con pricing, GET público excluye campos internos
- **Carrito:** CartContext + CartDrawer + WhatsApp submission
- **Bulk system:** Modelo Bulk, asignación a orderItems, trackingCode y status se propagan a items
- **Orders:** Nuevos campos cliente, ordenado por prioridad de status
- **Sidebar:** "Importación" → "Bultos"
- **Video background:** Video comprimido 645KB, dark overlay en landing
- **Fix deploy Railway:** BD con schema correcto se copia al runner (`COPY --from=deps /app/prisma/dev.db ./prisma/dev.db` en builder)
- **POST /api/productos funciona** — producto creado con costUSDT, finalPriceUSD, finalPriceARS
- **PUT /api/productos/[slug] funciona** — actualiza correctamente todos los campos

### ✅ Fix aplicados hoy

- **POST /api/productos** ahora lee `exchangeRate` desde la DB (tabla Setting) en vez de confiar en el valor que envía el cliente. Soluciona `finalPriceARS` incorrecto.
- **`costUSDT || priceUSD`** corregido: ahora usa solo `costUSDT`, sin fallback frágil a `priceUSD` (que puede no enviarse).
- **Seed creado** (`prisma/seed.ts`): inserta `exchange_rate=1350`, admin, settings y categorías por defecto. Es idempotente.
- **entrypoint.sh**: corre `prisma migrate deploy` + seed al arrancar el contenedor.
- **Dockerfile**: `DATABASE_URL` ahora apunta a `file:/data/dev.db` (volumen persistente Railway).
- **package.json**: `"seed": "tsx prisma/seed.ts"` configurado, postinstall lo ejecuta automáticamente.

### ⚠️ Problemas conocidos

- Email notifications sin configurar (placeholder en `PUT /api/bultos/[id]` listo para implementar)

### 📋 Pendiente

1. **Email service para notificaciones**
   - Cuando un Bulk cambia a `en_camino`, notificar a los clientes con items en ese bulk
   - Opciones: Nodemailer (SMTP), SendGrid, o Resend

## Stack

- Next.js (standalone output) + TypeScript + Tailwind
- Prisma + SQLite (con adater BetterSQLite3)
- Auth: NextAuth con CredentialsProvider
- Hosting: Railway con Dockerfile multi-stage
