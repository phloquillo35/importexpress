export interface PricingInput {
  costUSDT: number
  yoniEnabled: boolean
  shippingCost: number
  profitType: "percentage" | "fixed_usdt"
  profitValue: number
  exchangeRate: number
}

export interface PricingResult {
  finalPriceUSD: number
  finalPriceARS: number
}

export function calculateFinalPrice(input: PricingInput): PricingResult {
  let base = input.costUSDT

  if (input.yoniEnabled) {
    base += input.costUSDT * 0.25
  }

  base += input.shippingCost

  let profit = 0
  if (input.profitType === "percentage") {
    profit = base * (input.profitValue / 100)
  } else {
    profit = input.profitValue
  }

  const finalPriceUSD = Math.round((base + profit) * 100) / 100
  const finalPriceARS = Math.round(finalPriceUSD * input.exchangeRate)

  return { finalPriceUSD, finalPriceARS }
}
