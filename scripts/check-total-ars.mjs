// Diagnostic script: check totalARS status in the database
// Run: railway run node scripts/check-total-ars.mjs
// Or:  DATABASE_URL=... node scripts/check-total-ars.mjs

const pg = require("pg")

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

  // 1. Overall stats
  const { rows: stats } = await pool.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE "totalARS" IS NULL) AS nulls,
      COUNT(*) FILTER (WHERE "totalARS" = 0) AS zeros,
      COUNT(*) FILTER (WHERE "totalARS" > 0) AS ok
    FROM "Order"
  `)
  const s = stats[0]
  console.log("=== totalARS Diagnostic ===\n")
  console.log(`Total orders:       ${s.total}`)
  console.log(`totalARS IS NULL:   ${s.nulls} (${s.total ? (s.nulls / s.total * 100).toFixed(1) : 0}%)`)
  console.log(`totalARS = 0:       ${s.zeros} (${s.total ? (s.zeros / s.total * 100).toFixed(1) : 0}%)`)
  console.log(`totalARS > 0:       ${s.ok} (${s.total ? (s.ok / s.total * 100).toFixed(1) : 0}%)`)

  // 2. Sample orders with missing totalARS
  if (Number(s.nulls) + Number(s.zeros) > 0) {
    const { rows: missing } = await pool.query(`
      SELECT "internalNumber", "clientName", "totalUSD", "totalARS", "usdtRate"
      FROM "Order"
      WHERE "totalARS" IS NULL OR "totalARS" = 0
      ORDER BY "internalNumber"
      LIMIT 10
    `)
    console.log(`\n--- First ${missing.length} orders with missing totalARS ---`)
    for (const o of missing) {
      console.log(`  #${o.internalNumber} | ${o.clientName || "?"} | totalUSD=${o.totalUSD} | totalARS=${o.totalARS} | usdtRate=${o.usdtRate}`)
    }
  }

  // 3. Column existence check
  const { rows: cols } = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'Order' AND column_name IN ('totalARS', 'internalNumber', 'usdtRate', 'exchangeRate')
    ORDER BY column_name
  `)
  console.log(`\n--- Columns in "Order" table ---`)
  for (const c of cols) {
    console.log(`  ${c.column_name}: ${c.data_type} (nullable=${c.is_nullable})`)
  }

  await pool.end()
}

main().catch((err) => {
  console.error("❌ Diagnostic error:", err)
  process.exit(1)
})
