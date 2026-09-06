#!/usr/bin/env node
/**
 * assign-angles-c1.mjs — Assign 3 distinct angle images to C1 products
 *
 * C1 = products where ALL colors have >=3 distinct image URLs.
 * For each color, assigns: front = 1st URL, left = 2nd URL, right = 3rd URL.
 *
 * Usage: node scripts/assign-angles-c1.mjs [--dry-run] [--verbose]
 */

import pg from "pg"
const { Pool } = pg

const env = process.env.DATABASE_URL || "process.env.DATABASE_URL"
const pool = new Pool({ connectionString: env, ssl: { rejectUnauthorized: false } })

const DRY_RUN = process.argv.includes("--dry-run")
const VERBOSE = process.argv.includes("--verbose")

async function main() {
  console.log("=== assign-angles-c1.mjs ===")
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE (will update DB)"}`)
  console.log("")

  // 1. Fetch all active products with images
  const result = await pool.query(
    `SELECT id, slug, name, images FROM product
     WHERE "deletedAt" IS NULL AND images IS NOT NULL
     ORDER BY slug`
  )

  // 2. Classify C1: ALL colors must have >=3 distinct URLs
  const c1Products = []

  for (const row of result.rows) {
    const imgs = row.images
    if (!Array.isArray(imgs) || imgs.length === 0) continue

    // Group URLs by color (handle both plain strings and {url, color} objects)
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
    const allColorsHave3 = colors.every(c => byColor[c].length >= 3)

    if (allColorsHave3 && colors.length > 0) {
      c1Products.push({
        id: row.id,
        slug: row.slug,
        name: row.name,
        byColor
      })
    }
  }

  console.log(`Found ${c1Products.length} C1 products (all colors >=3 distinct URLs)`)
  console.log("")

  if (c1Products.length === 0) {
    console.log("No C1 products found. Nothing to assign.")
    await pool.end()
    return
  }

  // 3. Assign angles for each C1 product
  let updated = 0
  let skipped = 0

  for (const product of c1Products) {
    // Build angles object: for each color, pick first 3 URLs
    // Since angles are shared across colors (per 3-angles-constraint.md),
    // we use the first color's images as the canonical angles.
    const firstColor = Object.keys(product.byColor)[0]
    const urls = product.byColor[firstColor]

    const angles = {
      front: urls[0],
      left: urls[1],
      right: urls[2]
    }

    const angleMeta = {
      category: "C1",
      source: "official-manufacturer",
      assignedAt: new Date().toISOString(),
      exception: null,
      colorsCount: Object.keys(product.byColor).length,
      imagesPerColor: Object.fromEntries(
        Object.entries(product.byColor).map(([k, v]) => [k, v.length])
      )
    }

    if (VERBOSE) {
      console.log(`  ${product.slug}:`)
      console.log(`    front:  ${angles.front}`)
      console.log(`    left:   ${angles.left}`)
      console.log(`    right:  ${angles.right}`)
      console.log(`    colors: ${JSON.stringify(angleMeta.imagesPerColor)}`)
    }

    if (!DRY_RUN) {
      await pool.query(
        `UPDATE product SET angles = $1, "angleMeta" = $2 WHERE id = $3`,
        [JSON.stringify(angles), JSON.stringify(angleMeta), product.id]
      )
    }
    updated++
  }

  console.log("")
  console.log(`✅ C1 angles assigned: ${updated} products${DRY_RUN ? " (dry run)" : ""}`)
  if (skipped > 0) console.log(`⚠️  Skipped: ${skipped}`)

  // 4. Summary
  console.log("")
  console.log("--- Summary ---")
  console.log(`Total C1 products: ${c1Products.length}`)
  console.log(`Updated: ${updated}`)
  console.log(`Skipped: ${skipped}`)

  await pool.end()
}

main().catch(e => {
  console.error("Fatal:", e.message)
  process.exit(1)
})
