// Backfill totalARS for existing orders with null/0 totalARS
// Run: node scripts/backfill-total-ars.mjs
// Uses the same pricing calculation as the frontend

const { PrismaClient } = require("@prisma/client")
const { PrismaPg } = require("@prisma/adapter-pg")
const pg = require("pg")

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  const orders = await prisma.order.findMany({
    where: { OR: [{ totalARS: null }, { totalARS: 0 }] },
    include: {
      items: {
        include: {
          product: {
            select: {
              costUSDT: true, yoniEnabled: true, yoniType: true, yoniValue: true,
              shippingCost: true, profitType: true, profitValue: true,
            },
          },
        },
      },
    },
  })

  console.log(`→ Backfilling totalARS for ${orders.length} orders`)

  for (const order of orders) {
    let totalARS = 0
    for (const item of order.items) {
      const costUSDT = item.costUSDT ?? item.product.costUSDT ?? 0
      const yoniEnabled = item.yoniEnabled ?? item.product.yoniEnabled ?? false
      const yoniType = item.yoniType ?? item.product.yoniType ?? "percentage"
      const yoniValue = item.yoniValue ?? item.product.yoniValue ?? 0
      const shippingCost = item.shippingCost ?? item.product.shippingCost ?? 0
      const profitType = item.profitType ?? item.product.profitType ?? "percentage"
      const profitValue = item.profitValue ?? item.product.profitValue ?? 0

      let yoniUSDT = 0
      let baseUSDT = costUSDT
      if (yoniEnabled && yoniValue > 0) {
        if (yoniType === "percentage") yoniUSDT = costUSDT * (yoniValue / 100)
        else if (yoniType === "fixed_usdt") yoniUSDT = yoniValue
        else yoniUSDT = yoniValue / order.usdtRate
        baseUSDT += yoniUSDT
      }
      const baseCostARS = baseUSDT * order.usdtRate
      const subtotalARS = baseCostARS + shippingCost
      let profitARS = 0
      if (profitType === "percentage") profitARS = subtotalARS * (profitValue / 100)
      else if (profitType === "fixed_usdt") profitARS = profitValue * order.usdtRate
      else profitARS = profitValue
      const finalPriceARS = Math.round(subtotalARS + profitARS)
      totalARS += finalPriceARS * item.quantity
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { totalARS },
    })
    console.log(`  ✓ #${order.internalNumber}: $${totalARS.toLocaleString("es-AR")} ARS`)
  }

  console.log("✅ Backfill complete")
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("❌ Backfill error:", err)
  process.exit(1)
})
