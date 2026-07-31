// Backup de seguridad: imágenes actuales en la DB antes de la migración
import pg from "pg"
import fs from "fs"

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const prods = await pool.query(`SELECT id, images FROM "Product" WHERE images IS NOT NULL AND images != '[]'::jsonb`)
  const heroes = await pool.query(`SELECT id, image FROM "HeroBanner" WHERE image IS NOT NULL AND image != ''`)
  const backup = {
    timestamp: new Date().toISOString(),
    products: prods.rows,
    heroes: heroes.rows,
  }
  fs.writeFileSync("backup-imagenes-pre-migracion.json", JSON.stringify(backup, null, 2))
  console.log(`Backup guardado: ${backup.products.length} productos, ${backup.heroes.length} heroes`)
  await pool.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
