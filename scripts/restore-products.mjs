import pg from "pg"
import fs from "fs"

const { Pool } = pg
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})

const backup = JSON.parse(fs.readFileSync("/Users/pablohernandezcanelo/Desktop/importexpress-FULL-backup-2026-09-02T22-57-24.json", "utf-8"))

function ev(v) {
  if (v === null || v === undefined) return "NULL"
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE"
  if (typeof v === "number") return v
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'`
  return `'${String(v).replace(/'/g, "''")}'`
}

async function main() {
  // Check existing counts
  const existing = await pool.query("SELECT COUNT(*) FROM importexpress.category")
  console.log(`Categorías existentes: ${existing.rows[0].count}`)
  const existingProd = await pool.query("SELECT COUNT(*) FROM importexpress.product")
  console.log(`Productos existentes: ${existingProd.rows[0].count}`)

  const products = backup.products.map(p => {
    const f = {...p}
    if (f.storeId) { f.distributorId = f.storeId }
    delete f.storeId
    delete f.category
    delete f.yoniValue
    return f
  })

  const COLS = ['id','name','slug','description','specs','images','priceUSD','priceARS','costUSD','costUSDT','yoniEnabled','yoniType','yoniPercentage','hasFinancing','shippingCost','profitType','profitValue','finalPriceUSD','finalPriceARS','subtotalARS','profitARS','stock','minStock','isAvailable','isFeatured','freeShipping','categoryId','distributorId','createdAt','updatedAt','deletedAt']

  console.log(`\n📦 Insertando ${products.length} productos (direct connection)...`)
  let inserted = 0
  let failed = 0

  for (let i = 0; i < products.length; i++) {
    const row = products[i]
    const cols = COLS.filter(c => row[c] !== undefined)
    try {
      const vals = cols.map(c => ev(row[c]))
      await pool.query(`INSERT INTO importexpress.product (${cols.map(c => `"${c}"`).join(", ")}) VALUES (${vals.join(", ")}) ON CONFLICT (id) DO NOTHING`)
      inserted++
    } catch (e) {
      failed++
      if (failed <= 5) console.log(`  ⚠️ [${i}] ${row.name?.substring(0, 40)}: ${e.message.substring(0, 100)}`)
    }
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${products.length} (${inserted} OK, ${failed} fallidos)`)
  }

  console.log(`\n✅ Productos: ${inserted} insertados, ${failed} fallidos`)

  // Also restore orders, bulks, transactions
  const ORDER_COLS = ['id','internalNumber','clientName','clientSurname','clientPhone','clientEmail','clientContact','paymentStatus','amountPaidUSD','amountPaidARS','distributorId','totalUSD','totalARS','status','notes','exchangeRate','usdtRate','createdAt','updatedAt','deletedAt']
  for (const o of backup.orders) {
    const f = {...o}
    if (f.storeId) f.distributorId = f.storeId
    delete f.storeId
    const cols = ORDER_COLS.filter(c => f[c] !== undefined)
    try {
      const vals = cols.map(c => ev(f[c]))
      await pool.query(`INSERT INTO importexpress."order" (${cols.map(c => `"${c}"`).join(", ")}) VALUES (${vals.join(", ")}) ON CONFLICT (id) DO NOTHING`)
    } catch (e) { console.log(`  ⚠️ Order: ${e.message.substring(0, 80)}`) }
  }

  const HERO_COLS = ['id','type','position','image','link','order','isActive','createdAt','updatedAt']
  for (const h of backup.heroBanners) {
    const cols = HERO_COLS.filter(c => h[c] !== undefined)
    try {
      const vals = cols.map(c => ev(h[c]))
      await pool.query(`INSERT INTO importexpress."heroBanner" (${cols.map(c => `"${c}"`).join(", ")}) VALUES (${vals.join(", ")}) ON CONFLICT (id) DO NOTHING`)
    } catch (e) {}
  }

  // Final counts
  console.log("\n📊 Estado final:")
  for (const t of ['category','distributor','product','"order"','bulk','transaction','"heroBanner"']) {
    const r = await pool.query(`SELECT COUNT(*) FROM importexpress.${t}`)
    console.log(`  ${t}: ${r.rows[0].count}`)
  }

  await pool.end()
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1) })
