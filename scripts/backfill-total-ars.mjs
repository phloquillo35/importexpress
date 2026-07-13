// Backfill totalARS for existing orders with null/0 totalARS
// Uses raw pg (no Prisma) to avoid schema/model mismatch
// Run: node scripts/backfill-total-ars.mjs

const pg = require("pg")

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

  // Get orders with missing totalARS
  const { rows: orders } = await pool.query(
    `SELECT id, "internalNumber", "usdtRate", "exchangeRate" FROM "Order" WHERE "totalARS" IS NULL OR "totalARS" = 0`
  )
  console.log(`→ Backfilling totalARS for ${orders.length} orders`)

  let ok = 0
  let fail = 0

  for (const order of orders) {
    try {
      // Get order items with product defaults
      const { rows: items } = await pool.query(
        `SELECT oi.quantity,
                COALESCE(oi."costUSDT", p."costUSDT", 0) AS costUSDT,
                COALESCE(oi."yoniEnabled", p."yoniEnabled", false) AS "yoniEnabled",
                COALESCE(oi."yoniType", p."yoniType", 'percentage') AS "yoniType",
                COALESCE(oi."yoniValue", p."yoniValue", 0) AS "yoniValue",
                COALESCE(oi."shippingCost", p."shippingCost", 0) AS "shippingCost",
                COALESCE(oi."profitType", p."profitType", 'percentage') AS "profitType",
                COALESCE(oi."profitValue", p."profitValue", 0) AS "profitValue"
         FROM "OrderItem" oi
         LEFT JOIN "Product" p ON oi."productId" = p.id
         WHERE oi."orderId" = $1`,
        [order.id]
      )

      let totalARS = 0
      for (const item of items) {
        const costUSDT = Number(item.costusdt) || 0
        const yoniEnabled = item.yoniEnabled === true || item.yoniEnabled === "true"
        const yoniType = item.yoniType || "percentage"
        const yoniValue = Number(item.yoniValue) || 0
        const shippingCost = Number(item.shippingCost) || 0
        const profitType = item.profitType || "percentage"
        const profitValue = Number(item.profitValue) || 0
        const usdtRate = Number(order.usdtRate) || 1
        const quantity = Number(item.quantity) || 1

        let yoniUSDT = 0
        let baseUSDT = costUSDT
        if (yoniEnabled && yoniValue > 0) {
          if (yoniType === "percentage") yoniUSDT = costUSDT * (yoniValue / 100)
          else if (yoniType === "fixed_usdt") yoniUSDT = yoniValue
          else yoniUSDT = yoniValue / usdtRate
          baseUSDT += yoniUSDT
        }
        const baseCostARS = baseUSDT * usdtRate
        const subtotalARS = baseCostARS + shippingCost
        let profitARS = 0
        if (profitType === "percentage") profitARS = subtotalARS * (profitValue / 100)
        else if (profitType === "fixed_usdt") profitARS = profitValue * usdtRate
        else profitARS = profitValue
        const finalPriceARS = Math.round(subtotalARS + profitARS)
        totalARS += finalPriceARS * quantity
      }

      await pool.query(`UPDATE "Order" SET "totalARS" = $1 WHERE id = $2`, [totalARS, order.id])
      ok++
      if (ok <= 5 || ok % 50 === 0) {
        console.log(`  ✓ #${order.internalNumber || ok}: $${totalARS.toLocaleString("es-AR")} ARS`)
      }
    } catch (err) {
      fail++
      console.error(`  ✗ Order ${order.id}:`, err.message || err)
    }
  }

  console.log(`✅ Backfill complete: ${ok} updated, ${fail} failed`)
  await pool.end()
}

main().catch((err) => {
  console.error("❌ Backfill error:", err)
  process.exit(1)
})
