-- Migración base (baseline) generada desde prisma/schema.prisma.
--
-- Reemplaza el historial anterior de 18 migraciones, que no se podía aplicar sobre una base vacía: las
-- primeras creaban "Product", "Order"... con mayúscula y el esquema mapea a "product", "order"... en
-- minúscula, así que 20260904000000_add_product_angles fallaba ("relation "product" does not exist").
-- Las migraciones anteriores siguen en el historial de git.
--
-- Es IDEMPOTENTE a propósito: en una base vacía crea todo el esquema, y en la base de producción (que ya
-- tiene estas tablas) no cambia nada, así `prisma migrate deploy` funciona en los dos casos sin pasos
-- manuales. Las claves foráneas se crean solo si no existe ya una entre las mismas dos tablas.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE IF NOT EXISTS "admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Distributor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Distributor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "specs" JSONB,
    "images" JSONB,
    "angles" JSONB,
    "angleMeta" JSONB,
    "priceUSD" DOUBLE PRECISION NOT NULL,
    "priceARS" DOUBLE PRECISION,
    "costUSD" DOUBLE PRECISION,
    "costUSDT" DOUBLE PRECISION,
    "yoniEnabled" BOOLEAN NOT NULL DEFAULT false,
    "yoniType" TEXT NOT NULL DEFAULT 'percentage',
    "yoniPercentage" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "hasFinancing" BOOLEAN NOT NULL DEFAULT false,
    "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitType" TEXT NOT NULL DEFAULT 'percentage',
    "profitValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalPriceUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalPriceARS" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotalARS" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitARS" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 5,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "freeShipping" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT,
    "distributorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "order" (
    "id" TEXT NOT NULL,
    "internalNumber" SERIAL NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientSurname" TEXT NOT NULL DEFAULT '',
    "clientPhone" TEXT NOT NULL DEFAULT '',
    "clientEmail" TEXT NOT NULL DEFAULT '',
    "clientContact" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'debe',
    "amountPaidUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountPaidARS" DOUBLE PRECISION,
    "distributorId" TEXT,
    "totalUSD" DOUBLE PRECISION NOT NULL,
    "totalARS" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usdtRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "orderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT,
    "productSlug" TEXT,
    "quantity" INTEGER NOT NULL,
    "priceUSD" DOUBLE PRECISION NOT NULL,
    "bulkId" TEXT,
    "trackingCode" TEXT,
    "shippingStatus" TEXT NOT NULL DEFAULT 'pending',
    "bulkType" TEXT,
    "costUSDT" DOUBLE PRECISION,
    "yoniEnabled" BOOLEAN NOT NULL DEFAULT false,
    "yoniType" TEXT NOT NULL DEFAULT 'percentage',
    "yoniValue" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitType" TEXT NOT NULL DEFAULT 'percentage',
    "profitValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "color" TEXT,
    "storage" TEXT,
    "subtotalARS" DOUBLE PRECISION,
    "profitARS" DOUBLE PRECISION,
    "finalPriceARS" DOUBLE PRECISION,
    "finalPriceUSD" DOUBLE PRECISION,
    "logisticaUSDT" DOUBLE PRECISION,

    CONSTRAINT "orderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bulk" (
    "id" TEXT NOT NULL,
    "internalNumber" SERIAL NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'grande',
    "courier" TEXT NOT NULL DEFAULT 'buspack',
    "trackingCode" TEXT,
    "totalCostUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCostARS" DOUBLE PRECISION,
    "lastShippingPerItem" DOUBLE PRECISION,
    "stockApplied" BOOLEAN NOT NULL DEFAULT false,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "products" JSONB NOT NULL,
    "distributorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "bulk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "transaction" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "amountUSD" DOUBLE PRECISION NOT NULL,
    "amountARS" DOUBLE PRECISION,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "heroBanner" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'carousel',
    "position" TEXT NOT NULL DEFAULT 'carousel',
    "image" TEXT NOT NULL,
    "link" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "heroBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "admin_email_key" ON "admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "category_slug_key" ON "category"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "category_deletedAt_idx" ON "category"("deletedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "category_parentId_idx" ON "category"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "product_slug_key" ON "product"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "product_deletedAt_isAvailable_categoryId_idx" ON "product"("deletedAt", "isAvailable", "categoryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "product_isFeatured_idx" ON "product"("isFeatured");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "product_createdAt_idx" ON "product"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "order_internalNumber_key" ON "order"("internalNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bulk_internalNumber_key" ON "bulk"("internalNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "setting_key_key" ON "setting"("key");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE contype = 'f' AND conrelid = to_regclass('public."category"') AND confrelid = to_regclass('public."category"')
  ) THEN
    ALTER TABLE "category" ADD CONSTRAINT "category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE contype = 'f' AND conrelid = to_regclass('public."product"') AND confrelid = to_regclass('public."category"')
  ) THEN
    ALTER TABLE "product" ADD CONSTRAINT "product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE contype = 'f' AND conrelid = to_regclass('public."product"') AND confrelid = to_regclass('public."Distributor"')
  ) THEN
    ALTER TABLE "product" ADD CONSTRAINT "product_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE contype = 'f' AND conrelid = to_regclass('public."order"') AND confrelid = to_regclass('public."Distributor"')
  ) THEN
    ALTER TABLE "order" ADD CONSTRAINT "order_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE contype = 'f' AND conrelid = to_regclass('public."orderItem"') AND confrelid = to_regclass('public."order"')
  ) THEN
    ALTER TABLE "orderItem" ADD CONSTRAINT "orderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE contype = 'f' AND conrelid = to_regclass('public."orderItem"') AND confrelid = to_regclass('public."product"')
  ) THEN
    ALTER TABLE "orderItem" ADD CONSTRAINT "orderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE contype = 'f' AND conrelid = to_regclass('public."orderItem"') AND confrelid = to_regclass('public."bulk"')
  ) THEN
    ALTER TABLE "orderItem" ADD CONSTRAINT "orderItem_bulkId_fkey" FOREIGN KEY ("bulkId") REFERENCES "bulk"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE contype = 'f' AND conrelid = to_regclass('public."bulk"') AND confrelid = to_regclass('public."Distributor"')
  ) THEN
    ALTER TABLE "bulk" ADD CONSTRAINT "bulk_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE contype = 'f' AND conrelid = to_regclass('public."transaction"') AND confrelid = to_regclass('public."order"')
  ) THEN
    ALTER TABLE "transaction" ADD CONSTRAINT "transaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
