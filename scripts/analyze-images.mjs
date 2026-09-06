import pg from "pg"

const { Pool } = pg
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})

async function main() {
  console.log("🔍 Analizando imágenes en la DB...")
  
  const result = await pool.query(`
    SELECT id, name, slug, images 
    FROM importexpress.product 
    WHERE images IS NOT NULL AND images != 'null'::jsonb
    LIMIT 10
  `)
  
  console.log(`\n📦 Productos con imágenes: ${result.rows.length} (muestra de 10)`)
  
  for (const p of result.rows) {
    const imgs = p.images
    if (Array.isArray(imgs)) {
      console.log(`\n  ${p.name?.substring(0, 50)}`)
      imgs.forEach((img, i) => {
        console.log(`    [${i}] ${img.url?.substring(0, 80)}... (${img.color || 'sin color'})`)
      })
    }
  }
  
  // Count products with images
  const withImages = await pool.query(`
    SELECT COUNT(*) FROM importexpress.product 
    WHERE images IS NOT NULL AND images != 'null'::jsonb AND images != '[]'::jsonb
  `)
  const withoutImages = await pool.query(`
    SELECT COUNT(*) FROM importexpress.product 
    WHERE images IS NULL OR images = 'null'::jsonb OR images = '[]'::jsonb
  `)
  
  console.log(`\n📊 Resumen:`)
  console.log(`  Con imágenes: ${withImages.rows[0].count}`)
  console.log(`  Sin imágenes: ${withoutImages.rows[0].count}`)
  
  await pool.end()
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1) })
