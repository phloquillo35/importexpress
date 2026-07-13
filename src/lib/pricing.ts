export interface PricingInput {
  costUSDT: number
  yoniEnabled: boolean
  yoniType: "percentage" | "fixed_usdt" | "fixed_ars"
  yoniValue: number
  shippingCost: number
  profitType: "percentage" | "fixed_usdt" | "fixed_ars"
  profitValue: number
  exchangeRate: number
  usdtRate: number
}

export interface PricingResult {
  finalPriceUSD: number
  finalPriceARS: number
  subtotalARS: number
  profitARS: number
  profitUSDT: number
  yoniUSDT: number
}

export function calculateFinalPrice(input: PricingInput): PricingResult {
  let baseUSDT = input.costUSDT
  let yoniUSDT = 0

  if (input.yoniEnabled && input.yoniValue > 0) {
    if (input.yoniType === "percentage") {
      yoniUSDT = input.costUSDT * (input.yoniValue / 100)
    } else if (input.yoniType === "fixed_usdt") {
      yoniUSDT = input.yoniValue
    } else {
      yoniUSDT = input.yoniValue / input.usdtRate
    }
    baseUSDT += yoniUSDT
  }

  const baseCostARS = baseUSDT * input.usdtRate

  const subtotalARS = baseCostARS + input.shippingCost

  let profitARS = 0
  if (input.profitType === "percentage") {
    profitARS = subtotalARS * (input.profitValue / 100)
  } else if (input.profitType === "fixed_usdt") {
    profitARS = input.profitValue * input.usdtRate
  } else {
    profitARS = input.profitValue
  }

  const finalPriceARS = Math.round(subtotalARS + profitARS)
  const finalPriceUSD = Math.round((finalPriceARS / input.exchangeRate) * 100) / 100

  return {
    finalPriceUSD,
    finalPriceARS,
    subtotalARS,
    profitARS,
    profitUSDT: Math.round((profitARS / input.usdtRate) * 100) / 100,
    yoniUSDT: Math.round(yoniUSDT * 100) / 100,
  }
}

export function computeOrderTotalARS(
  order: {
    exchangeRate: number
    usdtRate: number
    items: Array<{
      quantity: number
      costUSDT: number | null
      yoniEnabled: boolean | null
      yoniType: string | null
      yoniValue: number | null
      shippingCost: number | null
      profitType: string | null
      profitValue: number | null
      product: {
        costUSDT: number | null
        yoniEnabled: boolean | null
        yoniType: string | null
        yoniValue: number | null
        shippingCost: number | null
        profitType: string | null
        profitValue: number | null
      }
    }>
  },
): number {
  const exchangeRate = order.exchangeRate || 1
  const usdtRate = order.usdtRate || 1
  let total = 0
  for (const item of order.items) {
    const pricing = calculateFinalPrice({
      costUSDT: item.costUSDT ?? item.product.costUSDT ?? 0,
      yoniEnabled: item.yoniEnabled ?? item.product.yoniEnabled ?? false,
      yoniType: (item.yoniType ?? item.product.yoniType ?? "percentage") as PricingInput["yoniType"],
      yoniValue: item.yoniValue ?? item.product.yoniValue ?? 0,
      shippingCost: item.shippingCost ?? item.product.shippingCost ?? 0,
      profitType: (item.profitType ?? item.product.profitType ?? "percentage") as PricingInput["profitType"],
      profitValue: item.profitValue ?? item.product.profitValue ?? 0,
      exchangeRate,
      usdtRate,
    })
    total += pricing.finalPriceARS * item.quantity
  }
  return total
}
