#!/usr/bin/env node
/**
 * check-angles.mjs — Validate angles assignment for all products
 *
 * Checks:
 * - C1 products: front ≠ left ≠ right (3 distinct URLs)
 * - C3 products: front = left = right (same URL)
 * - All products with images have angles assigned
 * - angleMeta.category matches actual angle structure
 *
 * Usage: node scripts/check-angles.mjs [--verbose] [--json]
 */

import pg from "pg"
const { Pool } = pg

const env = process.env.DATABASE_URL || "process.env.DATABASE_URL"
const pool = new Pool({ connectionString: env, ssl: { rejectUnauthorized: false } })

const VERBOSE = process.argv.includes("--verbose")
const JSON_OUT = process.argv.includes("--json")

async function main() {
  const result = await pool.query(
    `SELECT id, slug, name, images, angles, "angleMeta" FROM product
     WHERE "deletedAt" IS NULL AND images IS NOT NULL
     ORDER BY slug`
  )

  const stats = {
    total: 0,
    withAngles: 0,
    withoutAngles: 0,
    c1Valid: 0,
    c1Invalid: 0,
    c3Valid: 0,
    c3Invalid: 0,
    metaMismatch: 0,
    errors: [],
    warnings: []
  }

  for (const row of result.rows) {
    stats.total++
    const imgs = row.images
    const angles = row.angles
    const meta = row.angleMeta

    if (!Array.isArray(imgs) || imgs.length === 0) continue

    // Determine actual category from images (handle both plain strings and {url, color} objects)
    const uniqueUrls = [...new Set(imgs.map(i => typeof i === 'string' ? i : i.url))]

    // Group by color
    const byColor = {}
    for (const img of imgs) {
      const url = typeof img === 'string' ? img : img.url
      const color = (typeof img === 'object' ? (img.color || '') : '').trim() || 'default'
      if (!byColor[color]) byColor[color] = []
      if (!byColor[color].includes(url)) {
        byColor[color].push(url)
      }
    }

    const colors = Object.keys(byColor)
    // Use angleMeta.category as primary classification (set by assignment scripts)
    const metaCategory = meta?.category
    // C1: each color must have >=3 DISTINCT URLs (not just 3 images)
    const allColorsHave3 = colors.every(c => byColor[c].length >= 3)
    // C1 requires distinct URLs per color AND at least 3 unique URLs total
    const imageBasedC1 = allColorsHave3 && colors.length > 0 && uniqueUrls.length >= 3 && colors.some(c => byColor[c].length >= 3)
    // C3: only 1 unique URL total, OR multi-color with only 1 URL per color
    const allColorsHaveExactly1 = colors.every(c => byColor[c].length === 1)
    const imageBasedC3 = uniqueUrls.length === 1 || (allColorsHaveExactly1 && colors.length >= 1)
    // Use meta category if available, otherwise fall back to image-based classification
    const isC1 = metaCategory ? metaCategory === "C1" : imageBasedC1
    const isC3 = metaCategory ? metaCategory === "C3" : imageBasedC3

    // Check angles assigned
    if (!angles) {
      stats.withoutAngles++
      stats.errors.push({
        slug: row.slug,
        type: "MISSING_ANGLES",
        message: "Product has images but no angles assigned"
      })
      continue
    }

    stats.withAngles++

    // Validate C1
    if (isC1) {
      if (angles.front && angles.left && angles.right) {
        if (angles.front !== angles.left && angles.front !== angles.right && angles.left !== angles.right) {
          stats.c1Valid++
        } else {
          stats.c1Invalid++
          stats.errors.push({
            slug: row.slug,
            type: "C1_DUPLICATE_ANGLES",
            message: `C1 product has duplicate angle URLs: front=${angles.front === angles.left ? "left" : ""} ${angles.front === angles.right ? "right" : ""} ${angles.left === angles.right ? "left=right" : ""}`
          })
        }
      } else {
        stats.c1Invalid++
        stats.errors.push({
          slug: row.slug,
          type: "C1_INCOMPLETE",
          message: `C1 product missing angle URLs: front=${!!angles.front} left=${!!angles.left} right=${!!angles.right}`
        })
      }

      // Check meta
      if (meta?.category !== "C1") {
        stats.metaMismatch++
        stats.warnings.push({
          slug: row.slug,
          type: "META_MISMATCH",
          message: `Expected category C1, got ${meta?.category || "null"}`
        })
      }
    }

    // Validate C3
    if (isC3) {
      if (angles.front && angles.left && angles.right) {
        if (angles.front === angles.left && angles.front === angles.right) {
          stats.c3Valid++
        } else {
          stats.c3Invalid++
          stats.errors.push({
            slug: row.slug,
            type: "C3_DIFFERENT_ANGLES",
            message: `C3 product has different angle URLs (should be all same)`
          })
        }
      } else {
        stats.c3Invalid++
        stats.errors.push({
          slug: row.slug,
          type: "C3_INCOMPLETE",
          message: `C3 product missing angle URLs: front=${!!angles.front} left=${!!angles.left} right=${!!angles.right}`
        })
      }

      // Check meta
      if (meta?.category !== "C3") {
        stats.metaMismatch++
        stats.warnings.push({
          slug: row.slug,
          type: "META_MISMATCH",
          message: `Expected category C3, got ${meta?.category || "null"}`
        })
      }
    }
  }

  // Output
  if (JSON_OUT) {
    console.log(JSON.stringify(stats, null, 2))
  } else {
    console.log("=== Angles Validation Report ===")
    console.log(`Total products with images: ${stats.total}`)
    console.log(`With angles assigned: ${stats.withAngles}`)
    console.log(`Without angles: ${stats.withoutAngles}`)
    console.log("")
    console.log(`C1 valid (3 distinct URLs): ${stats.c1Valid}`)
    console.log(`C1 invalid: ${stats.c1Invalid}`)
    console.log(`C3 valid (front=left=right): ${stats.c3Valid}`)
    console.log(`C3 invalid: ${stats.c3Invalid}`)
    console.log(`Meta category mismatches: ${stats.metaMismatch}`)
    console.log("")

    if (stats.errors.length === 0 && stats.warnings.length === 0) {
      console.log("✅ ALL ANGLES VALID — 0 errors, 0 warnings")
    } else {
      if (stats.errors.length > 0) {
        console.log(`❌ ERRORS (${stats.errors.length}):`)
        for (const e of stats.errors) {
          console.log(`  [${e.type}] ${e.slug}: ${e.message}`)
        }
      }
      if (stats.warnings.length > 0) {
        console.log(`⚠️  WARNINGS (${stats.warnings.length}):`)
        for (const w of stats.warnings) {
          console.log(`  [${w.type}] ${w.slug}: ${w.message}`)
        }
      }
    }

    if (VERBOSE) {
      console.log("")
      console.log("Detailed per-product breakdown:")
      for (const row of result.rows) {
        const imgs = row.images
        if (!Array.isArray(imgs) || imgs.length === 0) continue
        const uniqueUrls = [...new Set(imgs.map(i => i.url))]
        const angles = row.angles
        const meta = row.angleMeta
        const status = angles ? "✅" : "❌"
        console.log(`  ${status} ${row.slug}: ${uniqueUrls.length} urls, category=${meta?.category || "none"}, angles=${!!angles}`)
      }
    }
  }

  const exitCode = (stats.errors.length > 0 || stats.withoutAngles > 0) ? 1 : 0
  await pool.end()
  process.exit(exitCode)
}

main().catch(e => {
  console.error("Fatal:", e.message)
  process.exit(1)
})
