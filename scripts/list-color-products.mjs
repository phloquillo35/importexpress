import pg from "pg"
const { Pool } = pg
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})
async function main() {
  const products = await pool.query(`
    SELECT id, slug, name, images
    FROM public.product
    WHERE images != '[]'::jsonb AND images IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(images) elem
      WHERE elem->>'color' IS NOT NULL AND elem->>'color' != '' AND elem->>'color' != '.'
    )
    ORDER BY "createdAt" DESC
  `)
  
  let totalColors = 0
  for (const row of products.rows) {
    const images = row.images
    const colors = [...new Set(images.map(i => i.color).filter(c => c && c !== "." && c !== ""))]
    if (colors.length > 0) {
      totalColors += colors.length
      console.log(`\n${row.slug}`)
      console.log(`  Colors (${colors.length}): ${colors.join(", ")}`)
      console.log(`  Total images: ${images.length}`)
    }
  }
  console.log(`\nTotal products: ${products.rows.length}`)
  console.log(`Total distinct colors: ${totalColors}`)
  
  await pool.end()
}
main()
