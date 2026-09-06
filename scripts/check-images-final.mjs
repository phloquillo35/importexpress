import pg from "pg"

const { Pool } = pg
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})

async function main() {
  const withImages = await pool.query(`
    SELECT COUNT(*) FROM importexpress.product 
    WHERE images IS NOT NULL AND images != 'null'::jsonb AND images != '[]'::jsonb
  `)
  const withoutImages = await pool.query(`
    SELECT COUNT(*) FROM importexpress.product 
    WHERE images IS NULL OR images = 'null'::jsonb OR images = '[]'::jsonb
  `)
  
  console.log("📊 Estado final de imágenes:")
  console.log(`  ✅ Con imágenes: ${withImages.rows[0].count}/305`)
  console.log(`  ❌ Sin imágenes: ${withoutImages.rows[0].count}/305`)
  
  if (withoutImages.rows[0].count > 0) {
    const missing = await pool.query(`
      SELECT id, name, slug FROM importexpress.product 
      WHERE images IS NULL OR images = 'null'::jsonb OR images = '[]'::jsonb
      ORDER BY name
    `)
    console.log("\nProductos sin imagen:")
    missing.rows.forEach(p => console.log(`  - ${p.name}`))
  }
  
  await pool.end()
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1) })
