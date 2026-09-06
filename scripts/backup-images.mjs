import fs from "fs"
import pg from "pg"
import path from "path"
import { fileURLToPath } from "url"

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

const outFile = path.join(projectRoot, "scripts", "backup-images-array.json")

async function main() {
  const products = await pool.query(`SELECT id, slug, images FROM public.product`)
  const map = {}
  for (const r of products.rows) {
    map[r.id] = { slug: r.slug, images: r.images }
  }
  fs.writeFileSync(outFile, JSON.stringify(map, null, 2))
  console.log(`Backed up ${products.rows.length} products' images arrays to ${outFile}`)
  await pool.end()
}
main().catch(e => { console.error(e.message); process.exit(1) })
