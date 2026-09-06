import pg from "pg"
import fs from "fs"

const { Pool } = pg
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})

async function main() {
  console.log("🔧 Creando schema importexpress...")
  await pool.query("CREATE SCHEMA IF NOT EXISTS importexpress")
  console.log("✅ Schema creado")

  // Create all tables
  const schema = `
    -- Admin
    CREATE TABLE IF NOT EXISTS importexpress.admin (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ
    );

    -- Category
    CREATE TABLE IF NOT EXISTS importexpress.category (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      image TEXT,
      "parentId" TEXT REFERENCES importexpress.category(id),
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ,
      "deletedAt" TIMESTAMPTZ
    );

    -- Store (mapped from Distributor)
    CREATE TABLE IF NOT EXISTS importexpress."distributor" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact TEXT,
      website TEXT,
      notes TEXT,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ,
      "deletedAt" TIMESTAMPTZ
    );

    -- Product
    CREATE TABLE IF NOT EXISTS importexpress.product (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      specs JSONB,
      images JSONB,
      "priceUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "priceARS" DOUBLE PRECISION,
      "costUSD" DOUBLE PRECISION,
      "costUSDT" DOUBLE PRECISION,
      "yoniEnabled" BOOLEAN DEFAULT FALSE,
      "yoniType" TEXT DEFAULT 'percentage',
      "yoniPercentage" DOUBLE PRECISION DEFAULT 25,
      "hasFinancing" BOOLEAN DEFAULT FALSE,
      "shippingCost" DOUBLE PRECISION DEFAULT 0,
      "profitType" TEXT DEFAULT 'percentage',
      "profitValue" DOUBLE PRECISION DEFAULT 0,
      "finalPriceUSD" DOUBLE PRECISION DEFAULT 0,
      "finalPriceARS" DOUBLE PRECISION DEFAULT 0,
      "subtotalARS" DOUBLE PRECISION DEFAULT 0,
      "profitARS" DOUBLE PRECISION DEFAULT 0,
      stock INT DEFAULT 0,
      "minStock" INT DEFAULT 5,
      "isAvailable" BOOLEAN DEFAULT TRUE,
      "isFeatured" BOOLEAN DEFAULT FALSE,
      "freeShipping" BOOLEAN DEFAULT FALSE,
      "categoryId" TEXT REFERENCES importexpress.category(id),
      "distributorId" TEXT REFERENCES importexpress."distributor"(id),
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ,
      "deletedAt" TIMESTAMPTZ
    );

    -- Order
    CREATE TABLE IF NOT EXISTS importexpress."order" (
      id TEXT PRIMARY KEY,
      "internalNumber" SERIAL UNIQUE,
      "clientName" TEXT NOT NULL,
      "clientSurname" TEXT DEFAULT '',
      "clientPhone" TEXT DEFAULT '',
      "clientEmail" TEXT DEFAULT '',
      "clientContact" TEXT,
      "paymentStatus" TEXT DEFAULT 'debe',
      "amountPaidUSD" DOUBLE PRECISION DEFAULT 0,
      "amountPaidARS" DOUBLE PRECISION,
      "distributorId" TEXT REFERENCES importexpress."distributor"(id),
      "totalUSD" DOUBLE PRECISION,
      "totalARS" DOUBLE PRECISION,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      "exchangeRate" DOUBLE PRECISION DEFAULT 0,
      "usdtRate" DOUBLE PRECISION DEFAULT 0,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ,
      "deletedAt" TIMESTAMPTZ
    );

    -- OrderItem
    CREATE TABLE IF NOT EXISTS importexpress."orderItem" (
      id TEXT PRIMARY KEY,
      "orderId" TEXT REFERENCES importexpress."order"(id),
      "productId" TEXT REFERENCES importexpress.product(id) ON DELETE SET NULL,
      "productName" TEXT,
      "productSlug" TEXT,
      quantity INT,
      "priceUSD" DOUBLE PRECISION,
      "bulkId" TEXT,
      "trackingCode" TEXT,
      "shippingStatus" TEXT DEFAULT 'pending',
      "bulkType" TEXT,
      "costUSDT" DOUBLE PRECISION,
      "yoniEnabled" BOOLEAN DEFAULT FALSE,
      "yoniType" TEXT DEFAULT 'percentage',
      "yoniValue" DOUBLE PRECISION DEFAULT 25,
      "shippingCost" DOUBLE PRECISION DEFAULT 0,
      "profitType" TEXT DEFAULT 'percentage',
      "profitValue" DOUBLE PRECISION DEFAULT 0,
      color TEXT,
      storage TEXT,
      "subtotalARS" DOUBLE PRECISION,
      "profitARS" DOUBLE PRECISION,
      "finalPriceARS" DOUBLE PRECISION,
      "finalPriceUSD" DOUBLE PRECISION,
      "logisticaUSDT" DOUBLE PRECISION
    );

    -- Bulk
    CREATE TABLE IF NOT EXISTS importexpress.bulk (
      id TEXT PRIMARY KEY,
      "internalNumber" SERIAL UNIQUE,
      type TEXT DEFAULT 'grande',
      courier TEXT DEFAULT 'buspack',
      "trackingCode" TEXT,
      "totalCostUSD" DOUBLE PRECISION DEFAULT 0,
      "totalCostARS" DOUBLE PRECISION,
      date TIMESTAMPTZ DEFAULT NOW(),
      status TEXT DEFAULT 'pending',
      notes TEXT,
      products JSONB,
      "distributorId" TEXT REFERENCES importexpress."distributor"(id),
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ,
      "deletedAt" TIMESTAMPTZ
    );

    -- Transaction
    CREATE TABLE IF NOT EXISTS importexpress.transaction (
      id TEXT PRIMARY KEY,
      type TEXT,
      concept TEXT,
      "amountUSD" DOUBLE PRECISION,
      "amountARS" DOUBLE PRECISION,
      date TIMESTAMPTZ DEFAULT NOW(),
      notes TEXT,
      "orderId" TEXT REFERENCES importexpress."order"(id),
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "deletedAt" TIMESTAMPTZ
    );

    -- HeroBanner
    CREATE TABLE IF NOT EXISTS importexpress."heroBanner" (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'carousel',
      position TEXT DEFAULT 'carousel',
      image TEXT,
      link TEXT,
      "order" INT DEFAULT 0,
      "isActive" BOOLEAN DEFAULT TRUE,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ
    );

    -- Setting
    CREATE TABLE IF NOT EXISTS importexpress.setting (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT
    );
  `

  await pool.query(schema)
  console.log("✅ Todas las tablas creadas")

  // Verify
  const tables = await pool.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'importexpress' ORDER BY table_name
  `)
  console.log("\n📋 Tablas en schema importexpress:")
  tables.rows.forEach(r => console.log("  ✓", r.table_name))

  await pool.end()
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1) })
