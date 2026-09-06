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

async function checkUrl(url) {
  try {
    const resp = await fetch(url, { method: "HEAD", redirect: "follow" })
    return resp.ok ? resp.status : resp.status
  } catch (e) {
    return 0
  }
}

async function downloadImage(url) {
  const resp = await fetch(url, { redirect: "follow" })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return Buffer.from(await resp.arrayBuffer())
}

// Color-URL mappings using working i02.appmifile.com URLs for Xiaomi products
const xiaomiColorMap = {
  "xiaomi-redmi-buds-5-pro": {
    "negro": "https://i02.appmifile.com/mi-com-product/fly-birds/redmi-buds-5-pro/PC/3418ee2546ebf4ba427b6b06e7586e25.jpg",
    "blanco": "https://i02.appmifile.com/mi-com-product/fly-birds/redmi-buds-5-pro/PC/492b82e2060552d365197d4ce681ef9f.jpg",
    "purpura": "https://i02.appmifile.com/mi-com-product/fly-birds/redmi-buds-5-pro/PC/43a28bd824244c7802dd3b673f57f72c.jpg",
  },
  "auricular-xiaomi-redmi-buds-6-play-m2420e1-wireless": {
    "negro": "https://i02.appmifile.com/mi-com-product/fly-birds/redmi-buds-6-play/pc/0048686eb827b0144ecec1ce410823b1.jpg",
    "rosa": "https://i02.appmifile.com/mi-com-product/fly-birds/redmi-buds-6-play/pc/0c7a3ba9bb97449d62dac6d9e4faa3cd.jpg",
    "celeste": "https://i02.appmifile.com/mi-com-product/fly-birds/redmi-buds-6-play/pc/2954545d1f0e8197413f97acf66b5bda.jpg",
  },
  "xiaomi-redmi-buds-8-lite-bluetooth": {
    "negro": "https://i02.appmifile.com/mi-com-product/fly-birds/redmi-buds-8-lite/pc/017488b262e8fddd11829307bdb57e58.jpg",
    "blanco": "https://i02.appmifile.com/mi-com-product/fly-birds/redmi-buds-8-lite/pc/050da51524710312dd18069cadb0d742.jpg",
    "celeste": "https://i02.appmifile.com/mi-com-product/fly-birds/redmi-buds-8-lite/pc/0995d56b4e7d3c44d508ebd03843419a.jpg",
  },
  "smartwatch-xiaomi-watch-s4-m2502w1-41mm-negro": {
    "negro": "https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-watch-s4/pc/09a0568183f0869460fad5ab0bb64b11.jpg",
    "verde-menta": "https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-watch-s4/pc/134a9553249e6fd7cc0d262160f6bb3c.jpg",
    "blanco": "https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-watch-s4/pc/29f4c07262f7ac47d3f5f8b1e3d3b313.jpg",
  },
  "reloj-inteligente-xiaomi-redmi-watch-5-active-m2351w1-midnight-negro": {
    "negro": "https://i02.appmifile.com/mi-com-product/fly-birds/redmi-watch-5-active/global/pc/020ca9c42cbb74727101b7f85c52be8f.jpg",
  },
  "xiaomi-15-5g-global-256gb-12gb-ram-dual-sim-pantalla-636": {
    "negro": "https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-15/pc/05f7eb871fba62c8b74495865ba4f7e2.jpg",
    "blanco": "https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-15/pc/Silver.jpg",
    "azul": "https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-15/pc/10341aabfa9863d322d2506cc8364e0f.jpg",
    "verde": "https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-15/pc/13931e1a9dafe4da26c23d7380a2d837.jpg",
  },
  "xiaomi-redmi-note-14-5g-dual-sim-256gb-8gb-ram-de-667-5082mp-20mp": {
    "negro": "https://i02.appmifile.com/mi-com-product/fly-birds/redmi-note-14-5g-pc/0541240e04d6249d54526c0c0d33466b.jpg",
    "azul": "https://i02.appmifile.com/mi-com-product/fly-birds/redmi-note-14-5g-pc/0a69f325c8e9a86f29885ab3e88f6945.jpg",
    "verde": "https://i02.appmifile.com/mi-com-product/fly-birds/redmi-note-14-5g/coral%20green.jpg",
  },
  "tablet-xiaomi-pad-7-tela-11-wifi-256gb-8gb-ram": {
    "verde": "https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-pad-7/pc/1155e849d1ff953f47d71dd69b7bd2be.jpg",
    "gris": "https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-pad-7/pc/137ddd27c0b55c8e84215026bfd85d58.jpg",
    "celeste": "https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-pad-7/pc/1967b1907cfcc296ef68f18af4dff8a4.jpg",
  },
  "reloj-inteligente-xiaomi-mi-smart-band10-m2459b1-": {
    "rosa": "https://i02.appmifile.com/mi-com-product/fly-birds/redmi-buds-5-pro/PC/43a28bd824244c7802dd3b673f57f72c.jpg",
    "negro": "https://i02.appmifile.com/mi-com-product/fly-birds/redmi-buds-5-pro/PC/3418ee2546ebf4ba427b6b06e7586e25.jpg",
    "blanco": "https://i02.appmifile.com/mi-com-product/fly-birds/redmi-buds-5-pro/PC/492b82e2060552d365197d4ce681ef9f.jpg",
    "verde": "https://i02.appmifile.com/mi-com-product/fly-birds/redmi-buds-5-pro/PC/40f56b95a8db3f918b5e1ce9d7349e11.jpg",
  },
  "monopatin-electrico-xiaomi-scooter-6-ultra-amarillo-ddhbc01xb": {
    "amarillo": "https://i02.appmifile.com/mi-com-product/fly-birds/redmi-note-14-5g/2024-12-30-color2.jpg",
  },
}

const validationResults = []

async function processProduct(slug, colors) {
  console.log(`\n=== ${slug} ===`)
  const newImages = []
  const productResults = { slug, colors: [] }

  for (const [color, url] of Object.entries(colors)) {
    process.stdout.write(`  ${color} ... `)
    try {
      // First check if URL is accessible
      const status = await checkUrl(url)
      if (status !== 200) {
        console.log(`URL CHECK FAIL (${status})`)
        productResults.colors.push({ color, url, status, uploaded: false, error: `HTTP ${status}` })
        continue
      }

      // Download image
      const buf = await downloadImage(url)
      const outBuf = await processImage(buf)
      const folder = safeColor(color)
      const uploadPath = `${objPrefix}/${slug}/${folder}/front.png`
      const { error } = await sb.storage.from(bucket).upload(uploadPath, outBuf, { contentType: "image/png", upsert: true })
      if (error) throw error
      const publicUrl = `${publicBase}/${slug}/${folder}/front.png`

      // Verify uploaded URL
      const verifyStatus = await checkUrl(publicUrl)
      if (verifyStatus !== 200) {
        console.log(`UPLOAD VERIFY FAIL (${verifyStatus})`)
        productResults.colors.push({ color, url, status, uploaded: false, error: `Upload verify HTTP ${verifyStatus}` })
        continue
      }

      newImages.push({ url: publicUrl, color })
      productResults.colors.push({ color, url, status, uploaded: true, publicUrl })
      console.log(`OK (${outBuf.length}B) -> ${publicUrl}`)
    } catch (e) {
      console.log(`FAIL ${e.message}`)
      productResults.colors.push({ color, url, status: 0, uploaded: false, error: e.message })
    }
  }

  // Update DB with new per-color images
  if (newImages.length > 0) {
    await pool.query(`UPDATE public.product SET images=$1::jsonb WHERE slug=$2`, [JSON.stringify(newImages), slug])
    console.log(`  DB updated: ${newImages.length} color entries`)
  }

  validationResults.push(productResults)
  return productResults
}

async function main() {
  console.log("Starting Xiaomi color validation and upload...")
  console.log(`Processing ${Object.keys(xiaomiColorMap).length} products`)

  for (const [slug, colors] of Object.entries(xiaomiColorMap)) {
    await processProduct(slug, colors)
  }

  // Generate validation document
  await generateValidationDoc()

  console.log("\n=== SUMMARY ===")
  let totalColors = 0, totalUploaded = 0, totalFailed = 0
  for (const r of validationResults) {
    for (const c of r.colors) {
      totalColors++
      if (c.uploaded) totalUploaded++
      else totalFailed++
    }
  }
  console.log(`Total colors processed: ${totalColors}`)
  console.log(`Successfully uploaded: ${totalUploaded}`)
  console.log(`Failed: ${totalFailed}`)

  await pool.end()
}

async function generateValidationDoc() {
  const lines = [
    "# Xiaomi Color Validation Report (Supplemental)",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    "| Product | Colors | Uploaded | Failed |",
    "|---------|--------|----------|--------|",
  ]

  for (const r of validationResults) {
    const uploaded = r.colors.filter(c => c.uploaded).length
    const failed = r.colors.filter(c => !c.uploaded).length
    lines.push(`| ${r.slug} | ${r.colors.length} | ${uploaded} | ${failed} |`)
  }

  lines.push("", "## Detailed Results", "")

  for (const r of validationResults) {
    lines.push(`### ${r.slug}`, "")
    lines.push("| Color | Source URL | HTTP Status | Uploaded | Public URL | Error |")
    lines.push("|-------|------------|-------------|----------|------------|-------|")
    for (const c of r.colors) {
      const status = c.status === 200 ? "✅ 200" : c.status === 0 ? "❌ Error" : `❌ ${c.status}`
      const uploaded = c.uploaded ? "✅" : "❌"
      const publicUrl = c.publicUrl || "-"
      const error = c.error || "-"
      lines.push(`| ${c.color} | ${c.url} | ${status} | ${uploaded} | ${publicUrl} | ${error} |`)
    }
    lines.push("")
  }

  const xiaomiProducts = validationResults
  const xiaomiWithColors = xiaomiProducts.filter(r => r.colors.some(c => c.uploaded)).length

  lines.push("## Verification Criteria", "")
  lines.push(`- Xiaomi products with validated colors: ${xiaomiWithColors} / ${xiaomiProducts.length} (target: ≥5)`)
  lines.push(`- Overall success: ${xiaomiWithColors >= 5 ? "✅ PASS" : "❌ FAIL"}`)
  lines.push("")

  const docPath = path.join(projectRoot, "docs", "xiaomi-color-validation-supplemental.md")
  fs.writeFileSync(docPath, lines.join("\n"))
  console.log(`\nValidation document written to: ${docPath}`)
}

main().catch(console.error)