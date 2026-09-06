import pg from "pg"
import { supabase } from "../src/lib/supabase.js"
const { Pool } = pg
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})
async function main() {
  const products = await pool.query(`SELECT slug, images FROM public.product`)
  const cloudinaryOnly = []
  for (const row of products.rows) {
    const imgs = row.images
    const hasSupabase = imgs?.some(i => i.url?.includes("supabase.co"))
    const hasCloudinary = imgs?.some(i => i.url?.includes("res.cloudinary"))
    if (hasCloudinary && !hasSupabase) cloudinaryOnly.push({ slug: row.slug, count: imgs?.length })
  }
  console.log(`Cloudinary-only products: ${cloudinaryOnly.length}`)
  // Check storage for a few of these
  const buckets = await supabase.storage.from('products').list()
  console.log("\nStorage 'products' top-level entries (first 20):")
  console.log(JSON.stringify(buckets.data?.slice(0,20).map(b => b.name) || buckets.error, null, 2))
  await pool.end()
}
main().catch(e => { console.error("Error:", e.message); process.exit(1) })
