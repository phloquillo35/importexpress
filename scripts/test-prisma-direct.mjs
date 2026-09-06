import pg from "pg"

const { Pool } = pg
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})

async function main() {
  // Check if images exist for a specific product
  const result = await pool.query(`
    SELECT id, name, images 
    FROM product 
    WHERE slug = 'pedalera-valeton-gp200'
  `)
  
  if (result.rows.length > 0) {
    const p = result.rows[0]
    console.log("Product:", p.name)
    console.log("Images (raw):", p.images)
    console.log("Images type:", typeof p.images)
    console.log("Images is array:", Array.isArray(p.images))
    if (Array.isArray(p.images)) {
      console.log("Images length:", p.images.length)
      if (p.images.length > 0) {
        console.log("First image:", p.images[0])
      }
    }
  } else {
    console.log("Product not found")
  }
  
  await pool.end()
}

main().catch(e => { console.error("Error:", e.message); process.exit(1) })
