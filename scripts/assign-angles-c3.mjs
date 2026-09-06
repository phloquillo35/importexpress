#!/usr/bin/env node
/**
 * assign-angles-c3.mjs — Assign front=left=right (single image) to C3 products
 *
 * C3 = products with only 1 distinct image URL (majority of catalog).
 * For each product, assigns: front = left = right = the single image URL.
 *
 * Usage: node scripts/assign-angles-c3.mjs [--dry-run] [--verbose]
 */

import pg from "pg"
const { Pool } = pg

const env = process.env.DATABASE_URL || "process.env.DATABASE_URL"
const pool = new Pool({ connectionString: env, ssl: { rejectUnauthorized: false } })

const DRY_RUN = process.argv.includes("--dry-run")
const VERBOSE = process.argv.includes("--verbose")

async function main() {
  console.log("=== assign-angles-c3.mjs ===")
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE (will update DB)"}`)
  console.log("")

  // 1. Fetch all active products with images
  const result = await pool.query(
    `SELECT id, slug, name, images FROM product
     WHERE "deletedAt" IS NULL AND images IS NOT NULL
     ORDER BY slug`
  )

  // 2. Classify C3: 1 distinct URL total, OR multiple colors each with exactly 1 URL
  //    (these are "relaxed C1" products — multi-color but only 1 image per color)
  const c3Products = []

  for (const row of result.rows) {
    const imgs = row.images
    if (!Array.isArray(imgs) || imgs.length === 0) continue

    const uniqueUrls = [...new Set(imgs.map(i => typeof i === 'string' ? i : i.url))]

    // Group by color (handle both plain strings and {url, color} objects)
    const byColor = {}
    for (const img of imgs) {
      const url = typeof img === 'string' ? img : img.url
      const color = (typeof img === 'object' ? (img.color || '') : '').trim() || 'default'
      if (!byColor[color]) byColor[color] = new Set()
      byColor[color].add(url)
    }

    const colors = Object.keys(byColor)
    const allColorsHaveExactly1 = colors.every(c => byColor[c].size === 1)

    // C3: either 1 URL total, OR every color has exactly 1 URL (multi-color, single image each)
    if (uniqueUrls.length === 1 || (allColorsHaveExactly1 && colors.length > 1)) {
      c3Products.push({
        id: row.id,
        slug: row.slug,
        name: row.name,
        singleUrl: uniqueUrls[0],
        imageCount: imgs.length,
        colorsCount: colors.length
      })
    }
  }

  console.log(`Found ${c3Products.length} C3 products (1 URL or multi-color with 1 URL each)`)
  console.log("")

  if (c3Products.length === 0) {
    console.log("No C3 products found. Nothing to assign.")
    await pool.end()
    return
  }

  // 3. Assign angles: front = left = right = single URL
  let updated = 0

  for (const product of c3Products) {
    const angles = {
      front: product.singleUrl,
      left: product.singleUrl,
      right: product.singleUrl
    }

    const angleMeta = {
      category: "C3",
      source: "official-manufacturer",
      assignedAt: new Date().toISOString(),
      exception: null
    }

    if (VERBOSE) {
      console.log(`  ${product.slug}: front=left=right = ${product.singleUrl.substring(0, 80)}...`)
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
  console.log(`✅ C3 angles assigned: ${updated} products${DRY_RUN ? " (dry run)" : ""}`)

  // 4. Summary
  console.log("")
  console.log("--- Summary ---")
  console.log(`Total C3 products: ${c3Products.length}`)
  console.log(`Updated: ${updated}`)

  await pool.end()
}

main().catch(e => {
  console.error("Fatal:", e.message)
  process.exit(1)
})
