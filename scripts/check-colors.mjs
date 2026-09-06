#!/usr/bin/env node
/**
 * check-colors.mjs — Full C4 inventory validator
 * 
 * Scans all active products and reports:
 * - C4 products (sameUrlAllColors) — should be 0
 * - Products with multiple colors (potential C4 candidates)
 * - Products with colorException documented (Option B)
 * - Summary statistics
 * 
 * Usage: node scripts/check-colors.mjs [--verbose] [--json]
 */

import pg from "pg"
const { Pool } = pg

const env = process.env.DATABASE_URL || "process.env.DATABASE_URL"
const pool = new Pool({ connectionString: env, ssl: { rejectUnauthorized: false } })

const VERBOSE = process.argv.includes("--verbose")
const JSON_OUT = process.argv.includes("--json")

async function main() {
  const result = await pool.query(
    `SELECT id, slug, name, images, specs FROM product 
     WHERE "deletedAt" IS NULL AND images IS NOT NULL 
     ORDER BY slug`
  )

  const stats = {
    total: 0,
    singleImage: 0,
    multiImage: 0,
    c4SameUrl: 0,
    c4WithException: 0,
    c4Fixed: 0,
    multiColorDistinctUrls: 0,
    products: []
  }

  for (const row of result.rows) {
    stats.total++
    const images = row.images
    const specs = row.specs || {}

    if (!Array.isArray(images) || images.length === 0) {
      stats.singleImage++
      continue
    }

    if (images.length === 1) {
      stats.singleImage++
      continue
    }

    stats.multiImage++

    // Analyze URL/color mapping
    const urlsByColor = {}
    const colorsByUrl = {}
    for (const img of images) {
      const c = (img.color || "").trim() || "(sin color)"
      const u = img.url
      if (!urlsByColor[c]) urlsByColor[c] = new Set()
      urlsByColor[c].add(u)
      if (!colorsByUrl[u]) colorsByUrl[u] = new Set()
      colorsByUrl[u].add(c)
    }

    const colorKeys = Object.keys(urlsByColor)
    const urlKeys = Object.keys(colorsByUrl)

    // Check C4: all colors share same URL(s)
    if (colorKeys.length > 1) {
      const firstUrls = urlsByColor[colorKeys[0]]
      const allSame = colorKeys.every(c => {
        const urls = urlsByColor[c]
        if (urls.size !== firstUrls.size) return false
        for (const u of urls) { if (!firstUrls.has(u)) return false }
        return true
      })

      if (allSame) {
        const hasException = specs.colorException
        if (hasException) {
          stats.c4WithException++
          stats.products.push({
            slug: row.slug,
            name: row.name,
            type: "C4-exception",
            colors: colorKeys,
            reason: specs.colorException
          })
        } else {
          stats.c4SameUrl++
          stats.products.push({
            slug: row.slug,
            name: row.name,
            type: "C4-BLOCKER",
            colors: colorKeys,
            imageCount: images.length
          })
        }
      } else {
        stats.multiColorDistinctUrls++
      }
    }
  }

  // Output
  if (JSON_OUT) {
    console.log(JSON.stringify(stats, null, 2))
  } else {
    console.log("=== C4 Color Inventory Report ===")
    console.log(`Total products: ${stats.total}`)
    console.log(`Single image: ${stats.singleImage}`)
    console.log(`Multiple images: ${stats.multiImage}`)
    console.log(`  Multi-color with distinct URLs: ${stats.multiColorDistinctUrls}`)
    console.log(`  C4 sameUrlAllColors (BLOCKER): ${stats.c4SameUrl}`)
    console.log(`  C4 with exception documented: ${stats.c4WithException}`)
    console.log("")

    if (stats.c4SameUrl === 0) {
      console.log("✅ ZERO C4 BLOCKERS — All sameUrlAllColors products resolved")
    } else {
      console.log("❌ C4 BLOCKERS REMAINING:")
      for (const p of stats.products.filter(p => p.type === "C4-BLOCKER")) {
        console.log(`  - ${p.slug} (${p.colors.length} colors, ${p.imageCount} images)`)
      }
    }

    if (stats.c4WithException > 0) {
      console.log("")
      console.log(`C4 with exception documented (${stats.c4WithException}):`)
      for (const p of stats.products.filter(p => p.type === "C4-exception")) {
        console.log(`  - ${p.slug}: ${p.reason.substring(0, 80)}...`)
      }
    }

    if (VERBOSE && stats.products.length > 0) {
      console.log("")
      console.log("Detailed products:")
      for (const p of stats.products) {
        console.log(`  [${p.type}] ${p.slug}`)
        console.log(`    Colors: ${p.colors.join(", ")}`)
      }
    }
  }

  await pool.end()
}

main().catch(e => {
  console.error("Fatal:", e.message)
  process.exit(1)
})
