// Script de conteo: URLs locales vs Cloudinary en toda la DB
import pg from "pg"

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  // PRODUCTOS: contar URLs locales vs cloudinary
  const products = await pool.query(`SELECT images FROM "Product" WHERE images IS NOT NULL AND images != '[]'::jsonb`)
  let localCount = 0, cloudCount = 0, totalImgs = 0
  const localUrls = new Set()

  for (const row of products.rows) {
    const imgs = row.images
    if (!Array.isArray(imgs)) continue
    for (const img of imgs) {
      const url = typeof img === "string" ? img : img?.url
      if (!url) continue
      totalImgs++
      if (url.includes("res.cloudinary.com")) cloudCount++
      else if (url.includes("/api/uploads/")) {
        localCount++
        localUrls.add(url)
      }
    }
  }

  console.log("=== PRODUCTOS (URLs de imágenes) ===")
  console.log(`Total URLs de imágenes: ${totalImgs}`)
  console.log(`  - Cloudinary: ${cloudCount}`)
  console.log(`  - Local (/api/uploads/): ${localCount}`)
  console.log(`  - URLs locales únicas: ${localUrls.size}`)

  // CATEGORÍAS
  const cats = await pool.query(`SELECT image FROM "Category" WHERE image IS NOT NULL AND image != ''`)
  let catLocal = 0, catCloud = 0
  for (const row of cats.rows) {
    if (row.image.includes("res.cloudinary.com")) catCloud++
    else if (row.image.includes("/api/uploads/")) catLocal++
  }
  console.log("\n=== CATEGORÍAS ===")
  console.log(`Total con imagen: ${cats.rows.length}`)
  console.log(`  - Cloudinary: ${catCloud}`)
  console.log(`  - Local: ${catLocal}`)

  // HERO BANNERS
  const heroes = await pool.query(`SELECT image FROM "HeroBanner" WHERE image IS NOT NULL AND image != ''`)
  let heroLocal = 0, heroCloud = 0
  for (const row of heroes.rows) {
    if (row.image.includes("res.cloudinary.com")) heroCloud++
    else if (row.image.includes("/api/uploads/")) heroLocal++
  }
  console.log("\n=== HERO BANNERS ===")
  console.log(`Total con imagen: ${heroes.rows.length}`)
  console.log(`  - Cloudinary: ${heroCloud}`)
  console.log(`  - Local: ${heroLocal}`)

  await pool.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
