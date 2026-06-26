export interface PricingInput {
  costUSDT: number
  yoniEnabled: boolean
  shippingCost: number
  profitType: "percentage" | "fixed_usdt" | "fixed_ars"
  profitValue: number
  exchangeRate: number
  usdtRate: number
}

export interface PricingResult {
  finalPriceUSD: number
  finalPriceARS: number
}

export function calculateFinalPrice(input: PricingInput): PricingResult {
  let baseUSDT = input.costUSDT

  if (input.yoniEnabled) {
    baseUSDT += input.costUSDT * 0.25
  }

  const baseCostARS = baseUSDT * input.usdtRate

  const subtotalARS = baseCostARS + input.shippingCost

  let profitARS = 0
  if (input.profitType === "percentage") {
    profitARS = subtotalARS * (input.profitValue / 100)
  } else {
    profitARS = input.profitValue
  }

  const finalPriceARS = Math.round(subtotalARS + profitARS)
  const finalPriceUSD = Math.round((finalPriceARS / input.exchangeRate) * 100) / 100

  return { finalPriceUSD, finalPriceARS }
}
