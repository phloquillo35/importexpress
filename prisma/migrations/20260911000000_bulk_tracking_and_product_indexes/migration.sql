-- Rastreo exacto del costo de envío ya aplicado por bulto (evita drift al re-editar)
-- y flag para no duplicar el incremento de stock si el estado de una importación
-- se alterna (recibido -> pendiente -> recibido).
ALTER TABLE "bulk" ADD COLUMN IF NOT EXISTS "lastShippingPerItem" DOUBLE PRECISION;
ALTER TABLE "bulk" ADD COLUMN IF NOT EXISTS "stockApplied" BOOLEAN NOT NULL DEFAULT false;

-- Índices para las columnas más consultadas por el catálogo público.
CREATE INDEX IF NOT EXISTS "product_deletedAt_isAvailable_categoryId_idx" ON "product" ("deletedAt", "isAvailable", "categoryId");
CREATE INDEX IF NOT EXISTS "product_isFeatured_idx" ON "product" ("isFeatured");
CREATE INDEX IF NOT EXISTS "product_createdAt_idx" ON "product" ("createdAt");
