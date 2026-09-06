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

const PROD_COLS = ['id','name','slug','description','specs','images','priceUSD','priceARS','costUSD','costUSDT','yoniEnabled','yoniType','yoniPercentage','hasFinancing','shippingCost','profitType','profitValue','finalPriceUSD','finalPriceARS','subtotalARS','profitARS','stock','minStock','isAvailable','isFeatured','freeShipping','categoryId','distributorId','createdAt','updatedAt','deletedAt']

async function main() {
  // Check which categoryIds don't exist
  const existingProd = await pool.query("SELECT id FROM importexpress.product")
  const existingProdIds = new Set(existingProd.rows.map(r => r.id))
  const failedProducts = backup.products.filter(p => !existingProdIds.has(p.id))
  
  console.log(`${failedProducts.length} productos aún fallidos:`)
  
  for (const p of failedProducts) {
    const catId = p.categoryId
    const catCheck = await pool.query("SELECT id, name FROM importexpress.category WHERE id = $1", [catId])
    if (catCheck.rows.length === 0) {
      console.log(`  ❌ ${p.name?.substring(0, 50)} → categoryId "${catId}" NO EXISTE`)
    }
  }
  
  // Insert with NULL categoryId for products whose category doesn't exist
  let inserted = 0
  for (const p of failedProducts) {
    const f = {...p}
    if (f.storeId) f.distributorId = f.storeId
    delete f.storeId
    delete f.category
    delete f.yoniValue
    // Set NULL categoryId if it doesn't exist
    const catCheck = await pool.query("SELECT id FROM importexpress.category WHERE id = $1", [f.categoryId])
    if (catCheck.rows.length === 0) f.categoryId = null
    const cols = PROD_COLS.filter(c => f[c] !== undefined)
    try {
      const vals = cols.map(c => ev(f[c]))
      await pool.query(`INSERT INTO importexpress.product (${cols.map(c => `"${c}"`).join(", ")}) VALUES (${vals.join(", ")}) ON CONFLICT (id) DO NOTHING`)
      inserted++
      console.log(`  ✅ ${f.name?.substring(0, 50)} (categoryId → NULL)`)
    } catch (e) {
      console.log(`  ⚠️ ${f.name?.substring(0, 50)}: ${e.message.substring(0, 100)}`)
    }
  }
  
  const total = await pool.query("SELECT COUNT(*) FROM importexpress.product")
  console.log(`\n📊 Total productos en DB: ${total.rows[0].count}`)
  
  await pool.end()
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1) })
