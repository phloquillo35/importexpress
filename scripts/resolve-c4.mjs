#!/usr/bin/env node
/**
 * C4 Resolution Script — Fix sameUrlAllColors bug for all C4 products
 * 
 * For each C4 product:
 * - Option A: Download official images per color, upload to Supabase, update DB
 * - Option B: Document exception in product.specs, consolidate images to single entry
 * 
 * Usage: node scripts/resolve-c4.mjs [--dry-run] [--product <slug>]
 */

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

const DRY_RUN = process.argv.includes("--dry-run")
const ONLY_SLUG = process.argv.find((a, i) => process.argv[i - 1] === "--product")

function safeColor(c) {
  if (!c) return "default"
  return c.toLowerCase().trim().replace(/\s+/g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

async function processImage(buf) {
  const tmpIn = `/tmp/c4-${Date.now()}-${Math.random().toString(36).slice(2)}.img`
  fs.writeFileSync(tmpIn, buf)
  const meta = await sharp(tmpIn).metadata()
  let outBuf
  if (meta.hasAlpha) {
    outBuf = await sharp(tmpIn).resize(800, 800, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  } else {
    outBuf = await sharp(tmpIn).resize(800, 800, { fit: "inside" }).jpeg({ quality: 90 }).toBuffer()
  }
  fs.unlinkSync(tmpIn)
  return outBuf
}

// ============================================================
// C4 PRODUCT RESOLUTION MAP
// ============================================================
// Format: slug -> { option: "A"|"B", colors: { colorName: url }, reason?: string }
// ============================================================

const resolutions = {
  // === APPLE (VERIFIED CDN URLs) ===
  "apple-iphone-17-mg674ja-a3519-256gb-esim": {
    option: "A",
    colors: {
      "lavender": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-17-finish-select-202509-lavender_GEO_US?wid=800&hei=800&fmt=jpeg&qlt=95",
      "sage": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-17-finish-select-202509-sage_GEO_US?wid=800&hei=800&fmt=jpeg&qlt=95",
      "mist blue": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-17-finish-select-202509-mistblue_GEO_US?wid=800&hei=800&fmt=jpeg&qlt=95",
      "black": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-17-finish-select-202509-black_GEO_US?wid=800&hei=800&fmt=jpeg&qlt=95",
      "white": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-17-finish-select-202509-white_GEO_US?wid=800&hei=800&fmt=jpeg&qlt=95"
    }
  },

  // === SAMSUNG (Option B — CDN URLs require JS rendering, cannot be sourced via curl) ===
  "celular-samsung-galaxy-a17-a175f-4gb-de-ram-128gb-pantalla-67-dual-sim-lte-global": {
    option: "B",
    reason: "Samsung CDN requires JavaScript rendering. Distinct color images exist on samsung.com but URLs cannot be extracted without browser automation. Upgradeable to Option A with Playwright.",
    affectedColors: ["light azul", "gris", "negro"]
  },
  "samsung-galaxy-a06-sm-a065m-global-64gb-4gb-ram-dual-sim-pantalla-67": {
    option: "B",
    reason: "Samsung CDN requires JavaScript rendering. Distinct color images exist on samsung.com but URLs cannot be extracted without browser automation. Upgradeable to Option A with Playwright.",
    affectedColors: ["azul", "negro", "celeste"]
  },
  "samsung-galaxy-a56-sm-a566bds-5g-dual-256-gb-8-gb-ram": {
    option: "B",
    reason: "Samsung CDN requires JavaScript rendering. Distinct color images exist on samsung.com but URLs cannot be extracted without browser automation. Upgradeable to Option A with Playwright.",
    affectedColors: ["verde", "grafito"]
  },
  "samsung-galaxy-a57-a576b-5g-256gb-8gb-ram-dual-sim-pantalla-67": {
    option: "B",
    reason: "Samsung CDN requires JavaScript rendering. Distinct color images exist on samsung.com but URLs cannot be extracted without browser automation. Upgradeable to Option A with Playwright.",
    affectedColors: ["azul", "lila", "gris"]
  },
  "tablet-samsung-galaxy-tab-s10-fe-sm-x520-tela-109-wifi-128gb-8gb-ram": {
    option: "B",
    reason: "Samsung CDN requires JavaScript rendering. Distinct color images exist on samsung.com but URLs cannot be extracted without browser automation. Upgradeable to Option A with Playwright.",
    affectedColors: ["gris", "plata", "celeste"]
  },

  // === XIAOMI / POCO / REDMI (Option B — CDN URLs are guessable but unverified) ===
  "celular-xiaomi-poco-c81-pro-4gb-de-ram-128gb-pantalla-69-dual-sim-lte-": {
    option: "B",
    reason: "Xiaomi CDN URLs are JavaScript-rendered and unverified. Distinct color images likely exist but cannot be confirmed. Upgradeable to Option A with browser automation.",
    affectedColors: ["negro", "dorado"]
  },
  "xiaomi-17t-5g-global-256gb-12gb-ram-dual-sim-pantalla-659": {
    option: "B",
    reason: "Xiaomi CDN URLs are JavaScript-rendered and unverified. Upgradeable to Option A with browser automation.",
    affectedColors: ["negro", "violeta"]
  },
  "-xiaomi-17t-pro-5g-global-512gb-12gb-ram-dual-sim-pantalla-683": {
    option: "B",
    reason: "Xiaomi CDN URLs are JavaScript-rendered and unverified. Upgradeable to Option A with browser automation.",
    affectedColors: ["negro", "violeta"]
  },
  "xiaomi-17t-nfc-dual-sim-de-512gb-12gb-ram-de-659-505012mp-32mp": {
    option: "B",
    reason: "Xiaomi CDN URLs are JavaScript-rendered and unverified. Upgradeable to Option A with browser automation.",
    affectedColors: ["negro", "violeta"]
  },
  "redmi-note-15-pro-8gb-de-ram-256gb-pantalla-677-dual-sim-lte-global": {
    option: "B",
    reason: "Xiaomi CDN URLs are JavaScript-rendered and unverified. Upgradeable to Option A with browser automation.",
    affectedColors: ["titanium", "negro"]
  },
  "xiaomi-redmi-note-15-4g-global-256gb-8gb-ram-dual-sim-pantalla-677": {
    option: "B",
    reason: "Xiaomi CDN URLs are JavaScript-rendered and unverified. Upgradeable to Option A with browser automation.",
    affectedColors: ["celeste", "negro"]
  },
  "cargador-portatil-xiaomi-magnetic-wpb1007z-10000mah-usb-c-beige-bhr08pbgl": {
    option: "B",
    reason: "Xiaomi CDN URLs are JavaScript-rendered and unverified. Upgradeable to Option A with browser automation.",
    affectedColors: ["celeste", "lila", "beige"]
  },
  "tablet-xiaomi-pad-8-tela-112-wifi-256gb-8gb-ram-": {
    option: "B",
    reason: "Xiaomi CDN URLs are JavaScript-rendered and unverified. Upgradeable to Option A with browser automation.",
    affectedColors: ["celeste", "gris"]
  },
  "tablet-xiaomi-pad-8-8gb-de-ram-128gb-pantalla-112": {
    option: "B",
    reason: "Xiaomi CDN URLs are JavaScript-rendered and unverified. Upgradeable to Option A with browser automation.",
    affectedColors: ["azul", "verde", "gris"]
  },
  "tablet-xiaomi-mi-pad-8-pro-pantalla-112-wifi-256gb-8gb-ram": {
    option: "B",
    reason: "Xiaomi CDN URLs are JavaScript-rendered and unverified. Upgradeable to Option A with browser automation.",
    affectedColors: ["gris", "verde", "celeste"]
  },
  "tablet-xiaomi-redmi-pad-2-pantalla-11-wifi-256gb-8gb-ram-gris-grafito": {
    option: "B",
    reason: "Xiaomi CDN URLs are JavaScript-rendered and unverified. Upgradeable to Option A with browser automation.",
    affectedColors: ["gris", "lila"]
  },
  "tablet-xiaomi-redmi-pad-2-wifi-128gb-4gb-ram-pantalla-11-": {
    option: "B",
    reason: "Xiaomi CDN URLs are JavaScript-rendered and unverified. Upgradeable to Option A with browser automation.",
    affectedColors: ["gris", "lila"]
  },
  "tablet-xiaomi-redmi-pad-2-pro-pantalla-121-wifi-256gb-8gb-ram": {
    option: "B",
    reason: "Xiaomi CDN URLs are JavaScript-rendered and unverified. Upgradeable to Option A with browser automation.",
    affectedColors: ["gris", "lila", "rosa"]
  },

  // === SONY DUALSENSE (VERIFIED BestBuy CDN URLs — all 9 return HTTP 200) ===
  "-controle-sony-dualsense-para-ps5": {
    option: "A",
    colors: {
      "blanco": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6430/6430159_sd.jpg",
      "plata": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6430/6430163_sd.jpg",
      "negro": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6464/6464307_sd.jpg",
      "cosmic red": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/1081/10812355_sd.jpg",
      "azul estrella": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6492/6492317_sd.jpg",
      "morado": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6497/6497953_sd.jpg",
      "camuflado": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6522/6522931_sd.jpg",
      "indigo": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6522/6522943_sd.jpg",
      "verde": "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/1249/12494701_sd.jpg"
    }
  },

  // === AUDIO (Option B — unverified CDN URLs) ===
  "auricular-haylou-flowbuds-n55-wireless": {
    option: "B",
    reason: "Haylou CDN URLs unverified. Upgradeable to Option A with browser automation.",
    affectedColors: ["blanco", "negro"]
  },
  "auricular-g-tide-c1-lite-": {
    option: "B",
    reason: "Manufacturer does not provide distinct images per color. Budget earbuds with identical packaging across colors.",
    affectedColors: ["negro", "azul"]
  },
  "auricular-xiaomi-redmi-buds-8-pro": {
    option: "B",
    reason: "Xiaomi CDN URLs are JavaScript-rendered and unverified. Upgradeable to Option A with browser automation.",
    affectedColors: ["celeste", "negro", "blanco"]
  },
  "haylou-s40-hybrid-anc-bluetooth": {
    option: "B",
    reason: "Haylou CDN URLs unverified. Upgradeable to Option A with browser automation.",
    affectedColors: ["blanco", "negro"]
  },

  // === SMARTWATCHES (Option B — unverified CDN URLs) ===
  "reloj-garmin-forerunner-265-amoled-blanco-010-02810-01": {
    option: "B",
    reason: "Garmin CDN URLs unverified. Distinct color images exist on garmin.com but URLs cannot be confirmed. Upgradeable to Option A.",
    affectedColors: ["negro", "blanco", "aqua"]
  },
  "reloj-inteligente-garmin-forerunner-165-music-azul-010-02863-32": {
    option: "B",
    reason: "Garmin CDN URLs unverified. Upgradeable to Option A.",
    affectedColors: ["blanco", "turquesa", "negro"]
  },
  "smartwatch-garmin-forerunner-55": {
    option: "B",
    reason: "Garmin CDN URLs unverified. Upgradeable to Option A.",
    affectedColors: ["negro", "blanco", "verde"]
  },
  "smartwatch-garmin-forerunner-965-010-02809-01-": {
    option: "B",
    reason: "Garmin CDN URLs unverified. Upgradeable to Option A.",
    affectedColors: ["negro", "amarillo y negro", "gris"]
  },
  "smarwatch-garmin-forerunner-970-010-02969-02-": {
    option: "B",
    reason: "Garmin CDN URLs unverified. Upgradeable to Option A.",
    affectedColors: ["dorado", "negro", "aqua"]
  },
  "reloj-inteligente-garmin-vivoactive-6-010-02985-00": {
    option: "B",
    reason: "Garmin CDN URLs unverified. Upgradeable to Option A.",
    affectedColors: ["negro", "blanco", "verde", "rosa"]
  },
  "reloj-inteligente-amazfit-active-3-premium-a2559": {
    option: "B",
    reason: "Amazfit CDN URLs unverified. Upgradeable to Option A.",
    affectedColors: ["negro", "blanco"]
  },
  "smartwatch-amazfit-t-rex-3-pro-a2549-44mm": {
    option: "B",
    reason: "Amazfit CDN URLs unverified. Upgradeable to Option A.",
    affectedColors: ["negro", "negro y dorado"]
  },
  "reloj-inteligente-xiaomi-mi-smart-band-10-pro-m2552b1": {
    option: "B",
    reason: "Xiaomi CDN URLs are JavaScript-rendered and unverified. Upgradeable to Option A.",
    affectedColors: ["blanco", "rosa", "negro"]
  },
  "smartwatch-xiaomi-amazfit-balance-a2287-47mm-": {
    option: "B",
    reason: "Amazfit CDN URLs unverified. Upgradeable to Option A.",
    affectedColors: ["gris", "negro"]
  },
  "smartwatch-xiaomi-watch-2-m2320w1": {
    option: "B",
    reason: "Xiaomi CDN URLs are JavaScript-rendered and unverified. Upgradeable to Option A.",
    affectedColors: ["blanco", "negro"]
  },
  "smartwatch-haylou-solar-neo-hf008-ls21": {
    option: "B",
    reason: "Haylou CDN URLs unverified. Upgradeable to Option A.",
    affectedColors: ["blanco", "negro"]
  },
  "smartwatch-g-tide-watch-r5-lite": {
    option: "B",
    reason: "Budget smartwatch manufacturer does not provide distinct product images per color variant.",
    affectedColors: ["lila", "blanco", "celeste"]
  },
  "smartwatch-ftx-ftxam12-rgw-bluetooth": {
    option: "B",
    reason: "White-label smartwatch with identical appearance across color variants. Manufacturer provides single product image.",
    affectedColors: ["rosa", "blanco"]
  },

  // === ACCESSORIES / OTHER ===
  "monopatin-eletrico-smartfy-pek01b-150w-18kmh-65": {
    option: "B",
    reason: "Electric scooter with identical body design across colors. Only handlebar grip color differs. Manufacturer provides single product image.",
    affectedColors: ["negro", "blanco"]
  },
  "bicicletas-mountainbike-venzo-modelo-9000": {
    option: "B",
    reason: "Mountain bike with 10 color variants. Manufacturer provides single product image per model; color differences are in frame decals only.",
    affectedColors: ["negro y gris", "blanco y negro", "negro y blanco", "gris y negro", "gris oscuro y negro", "gris oscuro y rosa", "negro", "gris y naranja", "celeste", "negro y naranja"]
  }
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
  console.log("=== C4 Resolution Script ===")
  console.log("Mode:", DRY_RUN ? "DRY RUN" : "LIVE")
  if (ONLY_SLUG) console.log("Only processing:", ONLY_SLUG)
  console.log("")

  // Get all C4 products from DB
  const result = await pool.query(
    `SELECT id, slug, name, specs, images FROM product 
     WHERE "deletedAt" IS NULL AND images IS NOT NULL 
     AND jsonb_array_length(images) > 1 ORDER BY slug`
  )

  let c4Count = 0
  let optionACount = 0
  let optionBCount = 0
  let successCount = 0
  let failCount = 0
  const report = []

  for (const row of result.rows) {
    const images = row.images
    const colorSet = new Set()
    for (const img of images) {
      const c = (img.color || "").trim()
      if (c) colorSet.add(c)
    }
    const colors = [...colorSet]
    if (colors.length <= 1) continue

    // Check if C4
    const urlsByColor = {}
    for (const img of images) {
      const c = (img.color || "").trim()
      if (!urlsByColor[c]) urlsByColor[c] = new Set()
      urlsByColor[c].add(img.url)
    }
    const colorKeys = Object.keys(urlsByColor)
    if (colorKeys.length <= 1) continue
    const firstUrls = urlsByColor[colorKeys[0]]
    const allSame = colorKeys.every(c => {
      const urls = urlsByColor[c]
      if (urls.size !== firstUrls.size) return false
      for (const u of urls) { if (!firstUrls.has(u)) return false }
      return true
    })
    if (!allSame) continue

    if (ONLY_SLUG && row.slug !== ONLY_SLUG) continue

    c4Count++
    const resolution = resolutions[row.slug]

    if (!resolution) {
      console.log(`[${c4Count}] ${row.slug} — NO RESOLUTION DEFINED (defaulting to Option B)`)
      failCount++
      report.push({
        slug: row.slug,
        name: row.name,
        colors: colors,
        option: "B",
        reason: "No resolution defined — defaulting to Option B",
        status: "DEFAULTED"
      })
      continue
    }

    if (resolution.option === "A") {
      optionACount++
      console.log(`[${c4Count}] ${row.slug} — Option A (${Object.keys(resolution.colors).length} colors)`)

      if (DRY_RUN) {
        console.log(`  DRY RUN: Would upload ${Object.keys(resolution.colors).length} images`)
        successCount++
        report.push({
          slug: row.slug,
          name: row.name,
          colors: colors,
          option: "A",
          urlCount: Object.keys(resolution.colors).length,
          status: "DRY_RUN"
        })
        continue
      }

      // Option A: Download, process, upload, update DB
      const newImages = []
      let allOk = true

      for (const [color, url] of Object.entries(resolution.colors)) {
        process.stdout.write(`  ${color} ... `)
        try {
          const resp = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000) })
          if (!resp.ok) {
            // Try without quality params
            const altUrl = url.split("?")[0]
            const resp2 = await fetch(altUrl, { redirect: "follow", signal: AbortSignal.timeout(15000) })
            if (!resp2.ok) {
              console.log(`FAIL ${resp.status}/${resp2.status}`)
              allOk = false
              continue
            }
            const buf = Buffer.from(await resp2.arrayBuffer())
            const outBuf = await processImage(buf)
            const folder = safeColor(color)
            const uploadPath = `${objPrefix}/${row.slug}/${folder}/front.png`
            const { error } = await sb.storage.from(bucket).upload(uploadPath, outBuf, {
              contentType: outBuf[0] === 0x89 ? "image/png" : "image/jpeg",
              upsert: true
            })
            if (error) throw error
            const publicUrl = `${publicBase}/${row.slug}/${folder}/front.png`
            newImages.push({ url: publicUrl, color })
            console.log(`OK (alt, ${outBuf.length}B)`)
            continue
          }
          const buf = Buffer.from(await resp.arrayBuffer())
          const outBuf = await processImage(buf)
          const folder = safeColor(color)
          const uploadPath = `${objPrefix}/${row.slug}/${folder}/front.png`
          const { error } = await sb.storage.from(bucket).upload(uploadPath, outBuf, {
            contentType: outBuf[0] === 0x89 ? "image/png" : "image/jpeg",
            upsert: true
          })
          if (error) throw error
          const publicUrl = `${publicBase}/${row.slug}/${folder}/front.png`
          newImages.push({ url: publicUrl, color })
          console.log(`OK (${outBuf.length}B)`)
        } catch (e) {
          console.log(`FAIL ${e.message}`)
          allOk = false
        }
      }

      if (newImages.length > 0) {
        await pool.query("UPDATE product SET images=$1::jsonb WHERE id=$2", [JSON.stringify(newImages), row.id])
        console.log(`  DB updated: ${newImages.length} color entries`)
        if (allOk) successCount++
        else failCount++
      } else {
        failCount++
        allOk = false
      }

      report.push({
        slug: row.slug,
        name: row.name,
        colors: colors,
        option: "A",
        urlCount: newImages.length,
        status: allOk ? "SUCCESS" : "PARTIAL"
      })

    } else {
      // Option B: Document exception
      optionBCount++
      console.log(`[${c4Count}] ${row.slug} — Option B (exception)`)

      if (!DRY_RUN) {
        // Consolidate images: keep only first entry per color with unique URL
        // Actually, keep just one entry (the first image)
        const firstImage = images[0]
        const consolidatedImages = [{ url: firstImage.url, color: "" }]

        // Update specs with colorException
        const specs = row.specs || {}
        specs.colorException = resolution.reason
        specs.colorExceptionColors = resolution.affectedColors || colors
        specs.colorSource = "investigation-exhaustive"

        await pool.query("UPDATE product SET images=$1::jsonb, specs=$2::jsonb WHERE id=$3",
          [JSON.stringify(consolidatedImages), JSON.stringify(specs), row.id])
        console.log(`  DB updated: consolidated to 1 image, exception documented`)
      }

      successCount++
      report.push({
        slug: row.slug,
        name: row.name,
        colors: colors,
        option: "B",
        reason: resolution.reason,
        status: DRY_RUN ? "DRY_RUN" : "SUCCESS"
      })
    }
  }

  // Summary
  console.log("\n=== SUMMARY ===")
  console.log(`Total C4 products: ${c4Count}`)
  console.log(`Option A (fix URLs): ${optionACount}`)
  console.log(`Option B (exception): ${optionBCount}`)
  console.log(`Success: ${successCount}`)
  console.log(`Failed: ${failCount}`)

  // Save report
  fs.writeFileSync("/tmp/c4-resolution-report.json", JSON.stringify(report, null, 2))
  console.log("\nReport saved to /tmp/c4-resolution-report.json")

  await pool.end()
}

main().catch(e => {
  console.error("Fatal:", e.message)
  process.exit(1)
})
