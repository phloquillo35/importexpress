import pg from "pg"

const { Pool } = pg
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})

async function main() {
  console.log("🔍 Verificando conexión a Supabase...")
  
  const test = await pool.query("SELECT NOW() as time")
  console.log(`✅ Conexión OK: ${test.rows[0].time}`)
  
  const counts = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM importexpress.category) as categories,
      (SELECT COUNT(*) FROM importexpress."distributor") as stores,
      (SELECT COUNT(*) FROM importexpress.product) as products,
      (SELECT COUNT(*) FROM importexpress."order") as orders
  `)
  
  const c = counts.rows[0]
  console.log("\n📊 Estado de la DB en Supabase:")
  console.log(`  Categorías: ${c.categories}`)
  console.log(`  Tiendas: ${c.stores}`)
  console.log(`  Productos: ${c.products}`)
  console.log(`  Pedidos: ${c.orders}`)
  
  const sample = await pool.query("SELECT name, slug, \"priceUSD\" FROM importexpress.product LIMIT 3")
  console.log("\n🏷️  Muestra de productos:")
  sample.rows.forEach(p => console.log(`  - ${p.name} ($${p.priceUSD})`))
  
  await pool.end()
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1) })
