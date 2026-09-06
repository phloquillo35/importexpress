import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import pg from "pg"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, "..")

function loadEnv(file) {
  if (!fs.existsSync(file)) return {}
  const env = {}
  for (const line of fs.readFileSync(file, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
  return env
}
const env = { ...loadEnv(path.join(projectRoot, ".env")), ...loadEnv(path.join(projectRoot, ".env.local")) }
const pool = new pg.Pool({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

const MODE = process.argv[2] || "to-front"   // to-front | from-backup

async function main() {
  let updated = 0
  if (MODE === "to-front") {
    // Point processed/front.png back to original front.png, keeping color labels
    const products = await pool.query(`SELECT id, slug, images FROM public.product`)
    for (const r of products.rows) {
      const imgs = r.images
      if (!Array.isArray(imgs) || imgs.length === 0) continue
      let changed = false
      const newImgs = imgs.map(entry => {
        const color = entry && typeof entry === "object" ? (entry.color || "") : ""
        if (entry && typeof entry === "object" && entry.url && entry.url.includes("/processed/front.png")) {
          changed = true
          return { url: entry.url.replace("/processed/front.png", "/front.png"), color }
        }
        return entry
      })
      if (changed) {
        await pool.query(`UPDATE public.product SET images = $1::jsonb WHERE id = $2`, [JSON.stringify(newImgs), r.id])
        updated++
      }
    }
    console.log(`Reverted ${updated} products to original front.png`)
  } else if (MODE === "from-backup") {
    const backup = JSON.parse(fs.readFileSync(path.join(projectRoot, "scripts", "backup-images-array.json"), "utf-8"))
    const ids = Object.keys(backup)
    for (const id of ids) {
      await pool.query(`UPDATE public.product SET images = $1::jsonb WHERE id = $2`, [JSON.stringify(backup[id].images), id])
      updated++
    }
    console.log(`Restored ${updated} products from backup (warning: includes dead Cloudinary URLs)`)
  }
  await pool.end()
}
main().catch(e => { console.error(e.message); process.exit(1) })
