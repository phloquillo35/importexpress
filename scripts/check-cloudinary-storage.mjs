import pg from "pg"
const { Pool } = pg
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL",
  ssl: { rejectUnauthorized: false }
})
const storageUrl = "https://vxttpffxhyrdeawjypks.supabase.co/storage/v1/object/public/products/products"

async function main() {
  const products = await pool.query(`SELECT slug, images FROM public.product`)
  const cloudinaryOnly = products.rows.filter(r => {
    const imgs = r.images
    const hasSupabase = imgs?.some(i => i.url?.includes("supabase.co"))
    const hasCloudinary = imgs?.some(i => i.url?.includes("res.cloudinary"))
    return hasCloudinary && !hasSupabase
  })
  console.log(`Cloudinary-only products: ${cloudinaryOnly.length}`)
  
  // Check a sample of them whether front.png exists in storage
  const sample = cloudinaryOnly.slice(0, 15)
  let frontExists = 0
  for (const p of sample) {
    const url = `${storageUrl}/${p.slug}/front.png`
    try {
      const resp = await fetch(url, { method: "HEAD" })
      const exists = resp.ok
      if (exists) frontExists++
      console.log(`${exists ? "YES" : "NO "} ${p.slug}`)
    } catch(e) {
      console.log(`ERR ${p.slug}: ${e.message}`)
    }
  }
  console.log(`\nSample: ${frontExists}/${sample.length} have front.png in storage`)
  await pool.end()
}
main().catch(e => { console.error("Error:", e.message); process.exit(1) })
