import pg from "pg"
const { Pool } = pg
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})
const storageUrl = "https://vxttpffxhyrdeawjypks.supabase.co/storage/v1/object/public/products/products"

async function frontExists(slug) {
  try {
    const resp = await fetch(`${storageUrl}/${slug}/front.png`, { method: "HEAD" })
    return resp.ok
  } catch { return false }
}

async function main() {
  const products = await pool.query(`SELECT slug, images FROM public.product`)
  const all = products.rows
  
  const noImageSlugs = all.filter(r => !Array.isArray(r.images) || r.images.length === 0).map(r => r.slug)
  const cloudinaryOnly = all.filter(r => {
    const imgs = r.images
    return imgs?.some(i => i.url?.includes("res.cloudinary")) && !imgs?.some(i => i.url?.includes("supabase.co"))
  }).map(r => r.slug)
  
  console.log(`Products with NO images in DB: ${noImageSlugs.length}`)
  
  // Check the 59 empty ones
  let emptyWithFront = 0
  const results = []
  for (const slug of noImageSlugs) {
    const exists = await frontExists(slug)
    if (exists) { emptyWithFront++; results.push(`YES ${slug}`) }
  }
  console.log(`\nEmpty-image products that HAVE front.png in storage: ${emptyWithFront}/${noImageSlugs.length}`)
  
  // Check all cloudinary-only
  console.log(`\nCloudinary-only that have front.png: (checking...)`)
  let clFront = 0
  for (const slug of cloudinaryOnly) {
    if (await frontExists(slug)) clFront++
  }
  console.log(`Cloudinary-only with front.png in storage: ${clFront}/${cloudinaryOnly.length}`)
  
  await pool.end()
}
main().catch(e => { console.error("Error:", e.message); process.exit(1) })
