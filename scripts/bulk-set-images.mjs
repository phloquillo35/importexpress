import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import pg from "pg"
import { createClient } from "@supabase/supabase-js"
import { imageMap } from "./image-map.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, "..")
const sharp = (await import("sharp")).default

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
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const bucket = "products"
const objPrefix = "products"
const publicBase = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${objPrefix}`
const pool = new pg.Pool({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

async function processImage(buf) {
  const tmpIn = `/tmp/bulk-${Date.now()}-${Math.random().toString(36).slice(2)}.img`
  fs.writeFileSync(tmpIn, buf)
  const meta = await sharp(tmpIn).metadata()
  let outBuf
  if (meta.hasAlpha) {
    outBuf = await sharp(tmpIn).resize(800, 800, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  } else {
    const { data, info } = await sharp(tmpIn).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const { width, height, channels } = info
    const out = Buffer.alloc(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels, o = (y * width + x) * 4
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const dist = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2)
      let a = 255
      if (dist < 230) a = Math.max(0, 255 - (230 - dist) * 25)
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a
    }
    outBuf = await sharp(out, { raw: { width, height, channels: 4 } }).resize(800, 800, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  }
  fs.unlinkSync(tmpIn)
  return outBuf
}

let ok = 0, fail = 0
for (const [slug, url] of Object.entries(imageMap)) {
  process.stdout.write(`${slug} ... `)
  try {
    const resp = await fetch(url, { redirect: "follow" })
    if (!resp.ok) { console.log(`DOWNLOAD FAIL ${resp.status}`); fail++; continue }
    const buf = Buffer.from(await resp.arrayBuffer())
    const outBuf = await processImage(buf)

    const uploadPath = `${objPrefix}/${slug}/front.png`
    const { error } = await sb.storage.from(bucket).upload(uploadPath, outBuf, { contentType: "image/png", upsert: true })
    if (error) throw error
    const newUrl = `${publicBase}/${slug}/front.png`

    const cur = await pool.query(`SELECT images FROM public.product WHERE slug=$1`, [slug])
    let color = ""
    if (cur.rows[0]?.images?.length) {
      const first = cur.rows[0].images.find(i => i && typeof i === "object" && i.color && i.color !== "")
      if (first?.color) color = first.color
    }
    await pool.query(`UPDATE public.product SET images=$1::jsonb WHERE slug=$2`, [JSON.stringify([{ url: newUrl, color }]), slug])
    console.log(`OK (${outBuf.length}B, color='${color}')`)
    ok++
  } catch (e) {
    console.log(`FAIL ${e.message}`)
    fail++
  }
}
console.log(`\nDONE. OK: ${ok}, FAIL: ${fail}`)
await pool.end()
