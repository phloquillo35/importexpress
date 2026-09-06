import pg from "pg"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"
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

async function main() {
  const res = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(images) i WHERE i->>'url' LIKE '%supabase.co%')) AS supabase,
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(images) i WHERE i->>'url' LIKE '%res.cloudinary%')) AS cloudinary,
      COUNT(*) FILTER (WHERE images IS NULL OR jsonb_array_length(images) = 0) AS empty,
      COUNT(*) AS total
    FROM public.product
  `)
  const r = res.rows[0]
  console.log(`Total products: ${r.total}`)
  console.log(`With Supabase URLs: ${r.supabase}`)
  console.log(`With Cloudinary URLs (dead): ${r.cloudinary}`)
  console.log(`Empty images: ${r.empty}`)

  // Check the processed urls
  const proc = await pool.query(`
    SELECT COUNT(*) AS c FROM public.product
    WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(images) i WHERE i->>'url' LIKE '%/processed/front.png')
  `)
  console.log(`Products pointing to processed/front.png: ${proc.rows[0].c}`)

  // Show remaining dead cloudinary slugs
  const dead = await pool.query(`
    SELECT slug FROM public.product
    WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(images) i WHERE i->>'url' LIKE '%res.cloudinary%')
  `)
  console.log(`\nStill pointing to dead Cloudinary:`)
  for (const row of dead.rows) console.log(`  - ${row.slug}`)
  await pool.end()
}
main().catch(e => { console.error(e.message); process.exit(1) })
