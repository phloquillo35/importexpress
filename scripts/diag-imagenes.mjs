// Script de diagnóstico: cuenta imágenes en la DB
// Uso: node scripts/diag-imagenes.mjs (requiere DATABASE_URL)
import pg from "pg"

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  // Productos con imágenes
  const products = await pool.query(`SELECT COUNT(*) as total FROM "Product"`)
  const productsWithImages = await pool.query(`SELECT COUNT(*) as total FROM "Product" WHERE images IS NOT NULL AND images != '[]'::jsonb`)
  console.log("=== PRODUCTOS ===")
  console.log(`Total: ${products.rows[0].total}`)
  console.log(`Con imágenes: ${productsWithImages.rows[0].total}`)

  // Muestra 3 ejemplos de URLs
  const sample = await pool.query(`SELECT images FROM "Product" WHERE images IS NOT NULL AND images != '[]'::jsonb LIMIT 3`)
  for (const row of sample.rows) {
    console.log("Ejemplo:", JSON.stringify(row.images).slice(0, 300))
  }

  // Categorías con imagen
  const cats = await pool.query(`SELECT COUNT(*) as total FROM "Category"`)
  const catsWithImage = await pool.query(`SELECT COUNT(*) as total FROM "Category" WHERE image IS NOT NULL AND image != ''`)
  console.log("\n=== CATEGORÍAS ===")
  console.log(`Total: ${cats.rows[0].total}`)
  console.log(`Con imagen: ${catsWithImage.rows[0].total}`)
  const catSample = await pool.query(`SELECT id, name, image FROM "Category" WHERE image IS NOT NULL AND image != '' LIMIT 5`)
  for (const row of catSample.rows) {
    console.log(`  - ${row.name}: ${row.image}`)
  }

  // HeroBanners
  const heroes = await pool.query(`SELECT COUNT(*) as total FROM "HeroBanner"`)
  const heroesWithImage = await pool.query(`SELECT COUNT(*) as total FROM "HeroBanner" WHERE image IS NOT NULL AND image != ''`)
  console.log("\n=== HERO BANNERS ===")
  console.log(`Total: ${heroes.rows[0].total}`)
  console.log(`Con imagen: ${heroesWithImage.rows[0].total}`)
  const heroSample = await pool.query(`SELECT id, type, image FROM "HeroBanner" LIMIT 7`)
  for (const row of heroSample.rows) {
    console.log(`  - ${row.type}: ${row.image}`)
  }

  await pool.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
