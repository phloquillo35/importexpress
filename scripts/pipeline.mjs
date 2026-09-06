import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import pg from "pg"
import { createClient } from "@supabase/supabase-js"
import { processImage } from "./process-image.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, "..")

// Load .env
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

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || "https://vxttpffxhyrdeawjypks.supabase.co"
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const DATABASE_URL = env.DATABASE_URL

const bucket = "products"
// Object path inside bucket is prefixed with "products/" (bucket 'products' contains a 'products/' folder)
const objPrefix = "products"
const storageBase = `${SUPABASE_URL}/storage/v1/object/public/${bucket}`
const publicBase = `${storageBase}/${objPrefix}`

const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

const USAGE = `node pipeline.mjs [--limit N] [--only-slugs a,b] [--dry-run] [--no-upload] [--resize] [--reuse-existing]`

let args = process.argv.slice(2)
function flag(name, def = false) { const i = args.indexOf(name); return i !== -1 ? args[i+1] ?? true : def }
const LIMIT = flag("--limit", Infinity)
const ONLY = flag("--only-slugs", null)
const DRY = args.includes("--dry-run")
const NO_UPLOAD = args.includes("--no-upload")

async function fileExists(slug, name) {
  try {
    const r = await fetch(`${publicBase}/${slug}/${name}`, { method: "HEAD" })
    return r.ok
  } catch { return false }
}

async function main() {
  // Load all products
  let products
  if (ONLY) {
    const slugs = ONLY.split(",").map(s => s.trim())
    products = await pool.query(`SELECT id, slug, images FROM public.product WHERE slug = ANY($1)`, [slugs])
  } else {
    products = await pool.query(`SELECT id, slug, images FROM public.product`)
  }
  console.log(`Total products loaded: ${products.rows.length}`)

  const toProcess = []
  for (const row of products.rows) {
    const imgs = row.images
    toProcess.push(row)
  }

  const processed = [], skippedNoSrc = [], errors = []
  let i = 0
  for (const row of toProcess) {
    if (i >= LIMIT) break
    i++
    const { slug, id } = row
    process.stdout.write(`[${i}/${toProcess.length}] ${slug} ... `)

    // Download original front.png
    const srcUrl = `${publicBase}/${slug}/front.png`
    let buf
    try {
      const r = await fetch(srcUrl)
      if (!r.ok) { console.log(`NO-FRONT (${r.status})`); skippedNoSrc.push(slug); continue }
      buf = Buffer.from(await r.arrayBuffer())
    } catch(e) { console.log(`NO-FRONT (${e.message})`); skippedNoSrc.push(slug); continue }

    // Process with sharp
    const tmpIn = path.join("/tmp", `in-${i}.png`)
    const tmpOut = path.join("/tmp", `out-${i}.png`)
    fs.writeFileSync(tmpIn, buf)
    let info
    try {
      info = await processImage(tmpIn, tmpOut)
    } catch(e) { console.log(`PROC-ERR ${e.message}`); errors.push({ slug, err: e.message }); continue }

    const outBuf = fs.readFileSync(tmpOut)
    fs.unlinkSync(tmpIn); fs.unlinkSync(tmpOut)

    if (DRY || NO_UPLOAD) {
      processed.push({ slug, id, info, outBytes: outBuf.length, updated: false })
      console.log(`OK (dry) ${info.isLightBg && info.isUniformBg ? "removed" : "kept"} t=${info.transparentPct}%`)
      continue
    }

    // Upload to processed/front.png
    try {
      const { error } = await sb.storage.from(bucket).upload(`${objPrefix}/${slug}/processed/front.png`, outBuf, {
        contentType: "image/png", upsert: true
      })
      if (error) throw error
    } catch(e) { console.log(`UPLOAD-ERR ${e.message}`); errors.push({ slug, err: e.message }); continue }

    processed.push({ slug, id, info, outBytes: outBuf.length, updated: false })
    console.log(`UPLOADED (${outBuf.length}B) ${info.isLightBg ? "removed" : "kept"} t=${info.transparentPct}%`)
  }

  console.log(`\n=== FINAL ===`)
  console.log(`Processed: ${processed.length}`)
  console.log(`No front source: ${skippedNoSrc.length}`)
  console.log(`Errors: ${errors.length}`)
  if (skippedNoSrc.length) console.log(`  No-front slugs: ${skippedNoSrc.slice(0,20).join(", ")}`)
  if (errors.length) console.log(`  Errors: ${errors.map(e => e.slug).slice(0,20).join(", ")}`)

  if (!DRY && !NO_UPLOAD) {
    // Update DB to point at processed/front.png, preserving color metadata structure
    console.log(`\nUpdating DB URLs to processed/front.png...`)
    let updated = 0
    for (const p of processed) {
      const newUrl = `${publicBase}/${p.slug}/processed/front.png`
      // Fetch current images array to preserve color labels
      const cur = await pool.query(`SELECT images FROM public.product WHERE id = $1`, [p.id])
      const curImgs = cur.rows[0]?.images || []
      let newImages
      if (Array.isArray(curImgs) && curImgs.length > 0) {
        // Preserve each entry's color label, point url to processed image
        newImages = curImgs.map(entry => {
          const color = entry && typeof entry === "object" ? (entry.color || "") : ""
          return { url: newUrl, color }
        })
      } else {
        newImages = [{ url: newUrl, color: "" }]
      }
      const { error } = await pool.query(
        `UPDATE public.product SET images = $1::jsonb WHERE id = $2`,
        [JSON.stringify(newImages), p.id]
      )
      if (!error) { updated++; p.updated = true }
      else { errors.push({ slug: p.slug, err: error.message }) }
    }
    console.log(`DB updated: ${updated} products`)
  }

  await pool.end()
}

main().catch(e => { console.error("\nFATAL:", e.message, e.stack); process.exit(1) })
