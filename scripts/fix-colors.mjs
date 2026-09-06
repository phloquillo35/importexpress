import pg from "pg"

const { Pool } = pg
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})

async function main() {
  console.log("=== S1: Fix Color Data Quality ===\n")

  // 1. Find all products with color variants
  const products = await pool.query(`
    SELECT id, slug, name, images 
    FROM public.product 
    WHERE images != '[]'::jsonb 
    AND images IS NOT NULL
  `)

  let fixed = 0
  let bugRemoved = 0
  let duplicatesMerged = 0

  for (const row of products.rows) {
    const images = row.images
    if (!Array.isArray(images) || images.length === 0) continue

    let changed = false
    const colorMap = new Map() // normalized color -> first image URL
    const newImages = []

    for (const img of images) {
      if (!img.color) {
        // No color tag, keep as-is
        newImages.push(img)
        continue
      }

      // Normalize color: lowercase, trim
      let color = img.color.toLowerCase().trim()
      
      // Remove bug values
      if (color === "." || color === "" || color === "null") {
        console.log(`  Removing bug color "${img.color}" from ${row.slug}`)
        bugRemoved++
        // Convert to uncolored image
        newImages.push({ url: img.url, color: null })
        changed = true
        continue
      }

      // Check for duplicates
      if (colorMap.has(color)) {
        console.log(`  Merging duplicate color "${color}" in ${row.slug}`)
        duplicatesMerged++
        // Keep the first image for this color
        continue
      }

      colorMap.set(color, img.url)
      newImages.push({ url: img.url, color })
      if (color !== img.color) changed = true
    }

    if (changed) {
      await pool.query(
        "UPDATE public.product SET images = $1 WHERE id = $2",
        [JSON.stringify(newImages), row.id]
      )
      fixed++
      console.log(`  Fixed: ${row.slug}`)
    }
  }

  console.log(`\n=== Results ===`)
  console.log(`Products fixed: ${fixed}`)
  console.log(`Bug colors removed: ${bugRemoved}`)
  console.log(`Duplicates merged: ${duplicatesMerged}`)

  // Show current color distribution
  const colorStats = await pool.query(`
    SELECT 
      (elem->>'color') as color,
      COUNT(*) as product_count
    FROM public.product,
         jsonb_array_elements(images) as elem
    WHERE elem->>'color' IS NOT NULL
    GROUP BY elem->>'color'
    ORDER BY product_count DESC
  `)

  console.log(`\nColor distribution after fix:`)
  for (const row of colorStats.rows) {
    console.log(`  ${row.color}: ${row.product_count} products`)
  }

  await pool.end()
}

main().catch(e => { console.error("Error:", e.message); process.exit(1) })
