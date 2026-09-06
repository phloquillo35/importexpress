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

const CAT_COLS = ['id','name','slug','description','image','parentId','createdAt','updatedAt','deletedAt']
const PROD_COLS = ['id','name','slug','description','specs','images','priceUSD','priceARS','costUSD','costUSDT','yoniEnabled','yoniType','yoniPercentage','hasFinancing','shippingCost','profitType','profitValue','finalPriceUSD','finalPriceARS','subtotalARS','profitARS','stock','minStock','isAvailable','isFeatured','freeShipping','categoryId','distributorId','createdAt','updatedAt','deletedAt']

async function main() {
  const existing = await pool.query("SELECT id FROM importexpress.category")
  const existingIds = new Set(existing.rows.map(r => r.id))
  
  const missing = backup.categories.filter(c => !existingIds.has(c.id))
  console.log(`Categorías faltantes: ${missing.length}/${backup.categories.length}`)
  
  const noParent = missing.filter(c => !c.parentId || existingIds.has(c.parentId))
  const hasParent = missing.filter(c => c.parentId && !existingIds.has(c.parentId))
  
  for (const cat of noParent) {
    const cols = CAT_COLS.filter(c => cat[c] !== undefined)
    try {
      const vals = cols.map(c => ev(cat[c]))
      await pool.query(`INSERT INTO importexpress.category (${cols.map(c => `"${c}"`).join(", ")}) VALUES (${vals.join(", ")}) ON CONFLICT (id) DO NOTHING`)
      existingIds.add(cat.id)
    } catch (e) { console.log(`  ⚠️ ${cat.name}: ${e.message.substring(0, 80)}`) }
  }
  console.log(`  Insertadas ${noParent.length} categorías padre`)
  
  for (const cat of hasParent) {
    const cols = CAT_COLS.filter(c => cat[c] !== undefined)
    try {
      const vals = cols.map(c => ev(cat[c]))
      await pool.query(`INSERT INTO importexpress.category (${cols.map(c => `"${c}"`).join(", ")}) VALUES (${vals.join(", ")}) ON CONFLICT (id) DO NOTHING`)
      existingIds.add(cat.id)
    } catch (e) { console.log(`  ⚠️ ${cat.name}: ${e.message.substring(0, 80)}`) }
  }
  console.log(`  Insertadas ${hasParent.length} categorías hijo`)
  
  const total = await pool.query("SELECT COUNT(*) FROM importexpress.category")
  console.log(`\n📊 Total categorías: ${total.rows[0].count}`)
  
  const existingProd = await pool.query("SELECT id FROM importexpress.product")
  const existingProdIds = new Set(existingProd.rows.map(r => r.id))
  
  const failedProducts = backup.products.filter(p => !existingProdIds.has(p.id))
  console.log(`\n📦 Reintentando ${failedProducts.length} productos fallidos...`)
  
  let inserted = 0
  let failed = 0
  
  for (const p of failedProducts) {
    const f = {...p}
    if (f.storeId) f.distributorId = f.storeId
    delete f.storeId
    delete f.category
    delete f.yoniValue
    const cols = PROD_COLS.filter(c => f[c] !== undefined)
    try {
      const vals = cols.map(c => ev(f[c]))
      await pool.query(`INSERT INTO importexpress.product (${cols.map(c => `"${c}"`).join(", ")}) VALUES (${vals.join(", ")}) ON CONFLICT (id) DO NOTHING`)
      inserted++
    } catch (e) {
      failed++
      if (failed <= 5) console.log(`  ⚠️ ${f.name?.substring(0, 40)}: ${e.message.substring(0, 100)}`)
    }
  }
  
  console.log(`  Reinsertados: ${inserted} OK, ${failed} aún fallidos`)
  
  const prodTotal = await pool.query("SELECT COUNT(*) FROM importexpress.product")
  console.log(`\n📊 Total productos: ${prodTotal.rows[0].count}`)
  
  await pool.end()
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1) })
