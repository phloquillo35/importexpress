import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import pg from "pg"
import { createClient } from "@supabase/supabase-js"

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

function safeColor(c) {
  if (!c) return "default"
  return c.toLowerCase().trim().replace(/\s+/g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

async function processImage(buf) {
  const tmpIn = `/tmp/bulkc-${Date.now()}-${Math.random().toString(36).slice(2)}.img`
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

// --- Per-color image map for joysticks ---
const colorMap = {
  "control-gamesir-g7-se-para-xbox-series-": {
    "blanco": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/75d96c0e-85c5-4b9e-b896-3c450a2f2197.jpg",
    "azul": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/94d2cddb-f6d7-443f-8234-391b6d9540e9.png",
    "naranja": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/ed307616-cbfd-4028-8e9a-dced197fef16.png",
    "rosa": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/efe58636-97d7-47af-9f61-ab4c1a5dcf59.png",
  },
  "control-sony-dualsense-para-ps5-cfi-zct2w": {
    "": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6430/6430163_sd.jpg",
    "morado": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6497/6497953_sd.jpg",
    "techno rojo": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/43806f76-47a0-4901-a273-b080eb9a9dff.png",
    "starlight azul": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6492/6492317_sd.jpg",
    "chroma pearl": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/392ad00c-3b3b-4239-b517-ee44db4e779d.jpg",
    "camuflado gris": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6522/6522931_sd.jpg",
    "remix verde": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/8bebe07f-bc6f-4505-8aee-a7044191bd3d.jpg",
  },
}

let totalOk = 0, totalFail = 0

for (const [slug, colors] of Object.entries(colorMap)) {
  console.log(`\n=== ${slug} ===`)
  const newImages = []
  for (const [color, url] of Object.entries(colors)) {
    process.stdout.write(`  ${color || "(default)"} ... `)
    try {
      const resp = await fetch(url, { redirect: "follow" })
      if (!resp.ok) { console.log(`DOWNLOAD FAIL ${resp.status}`); totalFail++; continue }
      const buf = Buffer.from(await resp.arrayBuffer())
      const outBuf = await processImage(buf)
      const folder = color ? safeColor(color) : "default"
      // For default (empty color), use front.png at root; for colors use subfolder
      const uploadPath = color ? `${objPrefix}/${slug}/${folder}/front.png` : `${objPrefix}/${slug}/front.png`
      const { error } = await sb.storage.from(bucket).upload(uploadPath, outBuf, { contentType: "image/png", upsert: true })
      if (error) throw error
      const publicUrl = color ? `${publicBase}/${slug}/${folder}/front.png` : `${publicBase}/${slug}/front.png`
      newImages.push({ url: publicUrl, color: color || "" })
      console.log(`OK (${outBuf.length}B) -> ${publicUrl}`)
      totalOk++
    } catch (e) {
      console.log(`FAIL ${e.message}`)
      totalFail++
    }
  }
  // For GameSir, we want one entry per color (not per original array duplication). For DualSense, also.
  // Update DB with the new per-color images array
  if (newImages.length > 0) {
    // For GameSir, original had 12 entries (3 per color dup). We deduplicate to 1 per color with real image.
    // For DualSense, 1 per color as well.
    await pool.query(`UPDATE public.product SET images=$1::jsonb WHERE slug=$2`, [JSON.stringify(newImages), slug])
    console.log(`  DB updated: ${newImages.length} color entries`)
  }
}

console.log(`\nDONE. OK: ${totalOk}, FAIL: ${totalFail}`)
await pool.end()
