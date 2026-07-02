export interface PricingInput {
  costUSDT: number
  yoniEnabled: boolean
  yoniPercentage: number
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
}

export function calculateFinalPrice(input: PricingInput): PricingResult {
  let baseUSDT = input.costUSDT

  if (input.yoniEnabled && input.yoniPercentage > 0) {
    baseUSDT += input.costUSDT * (input.yoniPercentage / 100)
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
  }
}
