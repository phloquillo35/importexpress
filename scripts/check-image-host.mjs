import pg from "pg"
const { Pool } = pg
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})
async function main() {
  const products = await pool.query(`SELECT id, slug, images FROM public.product`)
  
  let supabaseOnly = 0
  let cloudinary = 0
  let empty = 0
  let mixed = 0
  
  for (const row of products.rows) {
    const imgs = row.images
    if (!Array.isArray(imgs) || imgs.length === 0) { empty++; continue }
    const hasSupabase = imgs.some(i => i.url?.includes("supabase.co"))
    const hasCloudinary = imgs.some(i => i.url?.includes("res.cloudinary"))
    if (hasSupabase && !hasCloudinary) supabaseOnly++
    else if (hasCloudinary && !hasSupabase) cloudinary++
    else mixed++
  }
  
  console.log(`Total products: ${products.rows.length}`)
  console.log(`With Supabase images only: ${supabaseOnly}`)
  console.log(`With Cloudinary images only: ${cloudinary}`)
  console.log(`Mixed (both): ${mixed}`)
  console.log(`Empty images: ${empty}`)
  
  // Check a color product's current images
  const sample = await pool.query(`SELECT slug, images FROM public.product WHERE slug='xiaomi-redmi-buds-5-pro'`)
  console.log(`\nSample (xiaomi-redmi-buds-5-pro):`)
  console.log(JSON.stringify(sample.rows[0].images, null, 2))
  
  await pool.end()
}
main().catch(e => { console.error("Error:", e.message); process.exit(1) })
