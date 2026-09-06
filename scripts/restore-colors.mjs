import pg from "pg"
import fs from "fs"

const { Pool } = pg
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})

async function main() {
  console.log("=== Restoring color-variant products from backup ===\n")

  const backup = JSON.parse(fs.readFileSync("/Users/pablohernandezcanelo/Desktop/importexpress-FULL-backup-2026-09-02T22-57-24.json", "utf-8"))
  
  // Find products that had colors in the backup
  const colorProducts = backup.products.filter(p => {
    if (!p.images || !Array.isArray(p.images)) return false
    return p.images.some(i => i.color)
  })
  
  console.log(`Found ${colorProducts.length} products with colors in backup`)
  
  for (const product of colorProducts) {
    const slug = product.slug
    const images = product.images
    
    // Normalize colors
    const normalizedImages = images.map(img => ({
      url: img.url,
      color: img.color ? img.color.toLowerCase().trim() : null
    })).filter(img => img.color !== "." && img.color !== "")
    
    console.log(`\n${slug}:`)
    console.log(`  Original: ${images.length} images`)
    console.log(`  Normalized: ${normalizedImages.length} images`)
    console.log(`  Colors: ${[...new Set(normalizedImages.map(i => i.color))].join(", ")}`)
    
    // Update database
    await pool.query(
      "UPDATE public.product SET images = $1 WHERE slug = $2",
      [JSON.stringify(normalizedImages), slug]
    )
    console.log(`  Updated DB`)
  }
  
  // Verify
  const verify = await pool.query(`
    SELECT COUNT(*) FROM (
      SELECT id FROM public.product
      WHERE images != '[]'::jsonb AND images IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(images) elem
        WHERE elem->>'color' IS NOT NULL AND elem->>'color' != '' AND elem->>'color' != '.'
      )
    ) t
  `)
  console.log(`\nProducts with colors after restore: ${verify.rows[0].count}`)
  
  await pool.end()
}

main().catch(e => { console.error("Error:", e.message); process.exit(1) })
