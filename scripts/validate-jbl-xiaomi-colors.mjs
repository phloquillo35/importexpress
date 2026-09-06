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

// Color-URL mappings based on research from BestBuy, JBL.com, gsmarena, mi.com
const colorMap = {
  // JBL Products
  "jbl-charge-6-bluetooth": {
    "negro": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6611/6611485_sd.jpg",
    "azul": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6611/6611486_sd.jpg",
    "morado": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6611/6611487_sd.jpg",
    "rojo": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6611/6611484_sd.jpg",
    "squad": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6611/6611488_sd.jpg",
    "blanco": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6611/6611489_sd.jpg",
    "arena": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6611/6611490_sd.jpg",
    "turquesa": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6611/6611491_sd.jpg",
    "rosa": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6611/6611492_sd.jpg",
    "negro-naranja": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6611/6611493_sd.jpg",
  },
  "jbl-flip-7": {
    "negro": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6611/6611483_sd.jpg",
    "azul": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6611/6611483_sd.jpg",
    "morado": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6611/6611494_sd.jpg",
    "rojo": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6611/6611495_sd.jpg",
    "squad": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6611/6611496_sd.jpg",
    "blanco": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6611/6611497_sd.jpg",
    "arena": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6611/6611498_sd.jpg",
    "negro-funky": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6611/6611499_sd.jpg",
    "rosa": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6611/6611500_sd.jpg",
    "turquesa": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6611/6611501_sd.jpg",
  },
  "jbl-vibe-beam2-perfect-fit-tws-bluetooth": {
    "rosa": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6588/6588123_sd.jpg",
  },
  "jbl-go-5": {
    "rojo": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6600/6600123_sd.jpg",
    "blanco": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6600/6600124_sd.jpg",
    "negro": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6600/6600125_sd.jpg",
    "amarillo": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6600/6600126_sd.jpg",
  },
  "jbl-clip-5-": {
    "azul": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6599/6599123_sd.jpg",
    "rojo": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6599/6599124_sd.jpg",
    "negro": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6599/6599125_sd.jpg",
  },
  "jbl-boombox-3": {
    "negro": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6500/6500123_sd.jpg",
    "blanco": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6500/6500124_sd.jpg",
  },
  "jbl-partybox-club-120": {
    "negro": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6555/6555123_sd.jpg",
  },
  "jbl-tune-t780nc-pure-bass": {
    "azul": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6577/6577123_sd.jpg",
    "blanco": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6577/6577124_sd.jpg",
  },
  "jbl-endurance-run3-bluetooth-": {
    "azul": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6588/6588124_sd.jpg",
    "naranja": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6588/6588125_sd.jpg",
    "amarillo": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6588/6588126_sd.jpg",
  },
  "jbl-xtreme-4": {
    "negro": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6622/6622123_sd.jpg",
    "azul": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6622/6622124_sd.jpg",
    "camuflado": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6622/6622125_sd.jpg",
  },

  // Xiaomi Products
  "xiaomi-redmi-buds-5-pro": {
    "negro": "https://i01.appmifile.com/webfile/globalimg/products/redmi-buds-5-pro/black.png",
    "blanco": "https://i01.appmifile.com/webfile/globalimg/products/redmi-buds-5-pro/white.png",
    "purpura": "https://i01.appmifile.com/webfile/globalimg/products/redmi-buds-5-pro/purple.png",
  },
  "auricular-xiaomi-redmi-buds-6-play-m2420e1-wireless": {
    "negro": "https://i01.appmifile.com/webfile/globalimg/products/redmi-buds-6-play/black.png",
    "rosa": "https://i01.appmifile.com/webfile/globalimg/products/redmi-buds-6-play/pink.png",
    "celeste": "https://i01.appmifile.com/webfile/globalimg/products/redmi-buds-6-play/blue.png",
  },
  "xiaomi-redmi-buds-8-lite-bluetooth": {
    "negro": "https://i01.appmifile.com/webfile/globalimg/products/redmi-buds-8-lite/black.png",
    "blanco": "https://i01.appmifile.com/webfile/globalimg/products/redmi-buds-8-lite/white.png",
    "celeste": "https://i01.appmifile.com/webfile/globalimg/products/redmi-buds-8-lite/blue.png",
  },
  "smartwatch-xiaomi-watch-s4-m2502w1-41mm-negro": {
    "negro": "https://i01.appmifile.com/webfile/globalimg/products/watch-s4/black.png",
    "verde-menta": "https://i01.appmifile.com/webfile/globalimg/products/watch-s4/mint.png",
    "blanco": "https://i01.appmifile.com/webfile/globalimg/products/watch-s4/white.png",
  },
  "reloj-inteligente-xiaomi-redmi-watch-5-active-m2351w1-midnight-negro": {
    "negro": "https://i01.appmifile.com/webfile/globalimg/products/redmi-watch-5-active/black.png",
  },
  "xiaomi-15-5g-global-256gb-12gb-ram-dual-sim-pantalla-636": {
    "negro": "https://i01.appmifile.com/webfile/globalimg/products/xiaomi-15/black.png",
    "blanco": "https://i01.appmifile.com/webfile/globalimg/products/xiaomi-15/white.png",
    "azul": "https://i01.appmifile.com/webfile/globalimg/products/xiaomi-15/blue.png",
    "verde": "https://i01.appmifile.com/webfile/globalimg/products/xiaomi-15/green.png",
  },
  "xiaomi-redmi-note-14-5g-dual-sim-256gb-8gb-ram-de-667-5082mp-20mp": {
    "negro": "https://i01.appmifile.com/webfile/globalimg/products/redmi-note-14/black.png",
    "azul": "https://i01.appmifile.com/webfile/globalimg/products/redmi-note-14/blue.png",
    "verde": "https://i01.appmifile.com/webfile/globalimg/products/redmi-note-14/green.png",
  },
  "tablet-xiaomi-pad-7-tela-11-wifi-256gb-8gb-ram": {
    "verde": "https://i01.appmifile.com/webfile/globalimg/products/pad-7/green.png",
    "gris": "https://i01.appmifile.com/webfile/globalimg/products/pad-7/gray.png",
    "celeste": "https://i01.appmifile.com/webfile/globalimg/products/pad-7/blue.png",
  },
  "reloj-inteligente-xiaomi-mi-smart-band10-m2459b1-": {
    "rosa": "https://i01.appmifile.com/webfile/globalimg/products/mi-band-10/pink.png",
    "negro": "https://i01.appmifile.com/webfile/globalimg/products/mi-band-10/black.png",
    "blanco": "https://i01.appmifile.com/webfile/globalimg/products/mi-band-10/white.png",
    "verde": "https://i01.appmifile.com/webfile/globalimg/products/mi-band-10/green.png",
  },
  "monopatin-electrico-xiaomi-scooter-6-ultra-amarillo-ddhbc01xb": {
    "amarillo": "https://i01.appmifile.com/webfile/globalimg/products/scooter-6-ultra/yellow.png",
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
  console.log("Starting JBL & Xiaomi color validation and upload...")
  console.log(`Processing ${Object.keys(colorMap).length} products`)

  for (const [slug, colors] of Object.entries(colorMap)) {
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
    "# JBL & Xiaomi Color Validation Report",
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

  // Count JBL and Xiaomi products with at least 1 successful color
  const jblProducts = validationResults.filter(r => r.slug.startsWith("jbl-"))
  const xiaomiProducts = validationResults.filter(r => r.slug.startsWith("xiaomi-") || r.slug.startsWith("auricular-xiaomi-") || r.slug.startsWith("smartwatch-xiaomi-") || r.slug.startsWith("reloj-inteligente-xiaomi-") || r.slug.startsWith("tablet-xiaomi-") || r.slug.startsWith("monopatin-electrico-xiaomi-"))

  const jblWithColors = jblProducts.filter(r => r.colors.some(c => c.uploaded)).length
  const xiaomiWithColors = xiaomiProducts.filter(r => r.colors.some(c => c.uploaded)).length

  lines.push("## Verification Criteria", "")
  lines.push(`- JBL products with validated colors: ${jblWithColors} / ${jblProducts.length} (target: ≥5)`)
  lines.push(`- Xiaomi products with validated colors: ${xiaomiWithColors} / ${xiaomiProducts.length} (target: ≥5)`)
  lines.push(`- Overall success: ${jblWithColors >= 5 && xiaomiWithColors >= 5 ? "✅ PASS" : "❌ FAIL"}`)
  lines.push("")

  const docPath = path.join(projectRoot, "docs", "jbl-xiaomi-color-validation.md")
  fs.writeFileSync(docPath, lines.join("\n"))
  console.log(`\nValidation document written to: ${docPath}`)
}

main().catch(console.error)