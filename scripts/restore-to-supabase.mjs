import pg from "pg"
import fs from "fs"

const { Pool } = pg
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})

const backup = JSON.parse(fs.readFileSync("/Users/pablohernandezcanelo/Desktop/importexpress-FULL-backup-2026-09-02T22-57-24.json", "utf-8"))

function escapeVal(v) {
  if (v === null || v === undefined) return "NULL"
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE"
  if (typeof v === "number") return v
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'`
  return `'${String(v).replace(/'/g, "''")}'`
}

const CATEGORY_COLS = ['id', 'name', 'slug', 'description', 'image', 'parentId', 'createdAt', 'updatedAt', 'deletedAt']
const STORE_COLS = ['id', 'name', 'contact', 'website', 'notes', 'createdAt', 'updatedAt', 'deletedAt']
const PRODUCT_COLS = ['id', 'name', 'slug', 'description', 'specs', 'images', 'priceUSD', 'priceARS', 'costUSD', 'costUSDT', 'yoniEnabled', 'yoniType', 'yoniValue', 'hasFinancing', 'shippingCost', 'profitType', 'profitValue', 'finalPriceUSD', 'finalPriceARS', 'subtotalARS', 'profitARS', 'stock', 'minStock', 'isAvailable', 'isFeatured', 'freeShipping', 'categoryId', 'distributorId', 'createdAt', 'updatedAt', 'deletedAt']
const ORDER_COLS = ['id', 'internalNumber', 'clientName', 'clientSurname', 'clientPhone', 'clientEmail', 'clientContact', 'paymentStatus', 'amountPaidUSD', 'amountPaidARS', 'distributorId', 'totalUSD', 'totalARS', 'status', 'notes', 'exchangeRate', 'usdtRate', 'createdAt', 'updatedAt', 'deletedAt']
const BULK_COLS = ['id', 'internalNumber', 'type', 'courier', 'trackingCode', 'totalCostUSD', 'totalCostARS', 'date', 'status', 'notes', 'products', 'distributorId', 'createdAt', 'updatedAt', 'deletedAt']
const TX_COLS = ['id', 'type', 'concept', 'amountUSD', 'amountARS', 'date', 'notes', 'orderId', 'createdAt', 'deletedAt']
const HERO_COLS = ['id', 'type', 'position', 'image', 'link', 'order', 'isActive', 'createdAt', 'updatedAt']

function cleanRow(row, cols) {
  const clean = {}
  for (const c of cols) {
    if (row[c] !== undefined) clean[c] = row[c]
  }
  return clean
}

async function batchInsert(table, rows, cols, batchSize = 30) {
  if (!rows || !rows.length) return 0
  let total = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize).map(r => cleanRow(r, cols))
    const values = batch.map(row => 
      `(${cols.map(c => escapeVal(row[c])).join(", ")})`
    ).join(",\n")
    try {
      await pool.query(`INSERT INTO importexpress."${table}" (${cols.map(c => `"${c}"`).join(", ")}) VALUES ${values} ON CONFLICT (id) DO NOTHING`)
      total += batch.length
    } catch (e) {
      for (const row of batch) {
        try {
          const v = cols.map(c => escapeVal(row[c]))
          await pool.query(`INSERT INTO importexpress."${table}" (${cols.map(c => `"${c}"`).join(", ")}) VALUES (${v.join(", ")}) ON CONFLICT (id) DO NOTHING`)
          total++
        } catch (e2) { /* skip */ }
      }
    }
  }
  return total
}

async function main() {
  console.log("📥 Restaurando datos en Supabase...\n")

  const categories = await batchInsert("category", backup.categories, CATEGORY_COLS)
  console.log(`  ✓ Categorías: ${categories}/${backup.categories.length}`)

  const stores = await batchInsert("distributor", backup.stores.map(s => ({...s, id: s.id})), STORE_COLS)
  console.log(`  ✓ Tiendas: ${stores}/${backup.stores.length}`)

  // Fix storeId → distributorId for products
  const products = backup.products.map(p => {
    const fixed = {...p}
    if (fixed.storeId) { fixed.distributorId = fixed.storeId; delete fixed.storeId }
    delete fixed.category
    return fixed
  })
  const prodCount = await batchInsert("product", products, PRODUCT_COLS)
  console.log(`  ✓ Productos: ${prodCount}/${backup.products.length}`)

  // Fix storeId → distributorId for orders
  const orders = backup.orders.map(o => {
    const fixed = {...o}
    if (fixed.storeId) { fixed.distributorId = fixed.storeId; delete fixed.storeId }
    return fixed
  })
  const orderCount = await batchInsert("order", orders, ORDER_COLS)
  console.log(`  ✓ Pedidos: ${orderCount}/${backup.orders.length}`)

  const bulks = backup.bulks.map(b => {
    const fixed = {...b}
    if (fixed.storeId) { fixed.distributorId = fixed.storeId; delete fixed.storeId }
    return fixed
  })
  const bulkCount = await batchInsert("bulk", bulks, BULK_COLS)
  console.log(`  ✓ Bultos: ${bulkCount}/${backup.bulks.length}`)

  const txCount = await batchInsert("transaction", backup.transactions, TX_COLS)
  console.log(`  ✓ Transacciones: ${txCount}/${backup.transactions.length}`)

  const heroCount = await batchInsert("heroBanner", backup.heroBanners, HERO_COLS)
  console.log(`  ✓ Hero Banners: ${heroCount}/${backup.heroBanners.length}`)

  console.log("\n📊 Verificación final:")
  const counts = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM importexpress.category) as categories,
      (SELECT COUNT(*) FROM importexpress."distributor") as stores,
      (SELECT COUNT(*) FROM importexpress.product) as products,
      (SELECT COUNT(*) FROM importexpress."order") as orders,
      (SELECT COUNT(*) FROM importexpress.bulk) as bulks,
      (SELECT COUNT(*) FROM importexpress.transaction) as transactions
  `)
  const c = counts.rows[0]
  console.log(`  Categorías: ${c.categories}`)
  console.log(`  Tiendas: ${c.stores}`)
  console.log(`  Productos: ${c.products}`)
  console.log(`  Pedidos: ${c.orders}`)
  console.log(`  Bultos: ${c.bulks}`)
  console.log(`  Transacciones: ${c.transactions}`)

  await pool.end()
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1) })
