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

export interface EffectivePricingItem {
  quantity: number
  costUSDT: number | null
  yoniEnabled: boolean
  yoniType: string
  yoniValue: number
  shippingCost: number
  profitType: string
  profitValue: number
  logisticaUSDT?: number | null
  subtotalARS?: number | null
  profitARS?: number | null
  finalPriceARS?: number | null
  finalPriceUSD?: number | null
}

export interface EffectivePricing {
  costUSDT: number
  yoniUSDT: number
  shippingCost: number
  logisticaUSDT: number
  subtotalARS: number
  profitARS: number
  finalPriceARS: number
  finalPriceUSD: number
  overridden: boolean
}

export function getItemEffectivePricing(
  item: EffectivePricingItem,
  exchangeRate: number,
  usdtRate: number,
): EffectivePricing {
  const perUnit = calculateFinalPrice({
    costUSDT: item.costUSDT ?? 0,
    yoniEnabled: item.yoniEnabled ?? false,
    yoniType: (item.yoniType ?? "percentage") as PricingInput["yoniType"],
    yoniValue: item.yoniValue ?? 0,
    shippingCost: item.shippingCost ?? 0,
    profitType: (item.profitType ?? "percentage") as PricingInput["profitType"],
    profitValue: item.profitValue ?? 0,
    exchangeRate,
    usdtRate,
  })

  const costUSDT = (item.costUSDT ?? 0) * item.quantity
  const yoniUSDT = Math.round(perUnit.yoniUSDT * item.quantity * 100) / 100
  const shippingCost = (item.shippingCost ?? 0) * item.quantity
  const calcSubtotalARS = Math.round(perUnit.subtotalARS * item.quantity)
  const calcProfitARS = Math.round(perUnit.profitARS * item.quantity)
  const calcFinalARS = Math.round(perUnit.finalPriceARS * item.quantity)
  const calcFinalUSD = Math.round(perUnit.finalPriceUSD * item.quantity * 100) / 100
  const calcLogisticaUSDT = item.yoniEnabled ? yoniUSDT : 0

  const logisticaUSDT = item.logisticaUSDT ?? calcLogisticaUSDT
  const subtotalARS = item.subtotalARS ?? calcSubtotalARS
  const profitARS = item.profitARS ?? calcProfitARS
  const finalPriceARS = item.finalPriceARS ?? calcFinalARS
  const finalPriceUSD = item.finalPriceUSD ?? calcFinalUSD

  const overridden =
    item.logisticaUSDT != null ||
    item.subtotalARS != null ||
    item.profitARS != null ||
    item.finalPriceARS != null ||
    item.finalPriceUSD != null

  return {
    costUSDT,
    yoniUSDT,
    shippingCost,
    logisticaUSDT,
    subtotalARS,
    profitARS,
    finalPriceARS,
    finalPriceUSD,
    overridden,
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
    }>
  },
  defaults?: { exchangeRate: number; usdtRate: number },
): number {
  const exchangeRate = (order.exchangeRate || defaults?.exchangeRate) ?? 1
  const usdtRate = (order.usdtRate || defaults?.usdtRate) ?? 1
  let total = 0
  for (const item of order.items) {
    const pricing = calculateFinalPrice({
      costUSDT: item.costUSDT ?? 0,
      yoniEnabled: item.yoniEnabled ?? false,
      yoniType: (item.yoniType ?? "percentage") as PricingInput["yoniType"],
      yoniValue: item.yoniValue ?? 0,
      shippingCost: item.shippingCost ?? 0,
      profitType: (item.profitType ?? "percentage") as PricingInput["profitType"],
      profitValue: item.profitValue ?? 0,
      exchangeRate,
      usdtRate,
    })
    total += pricing.finalPriceARS * item.quantity
  }
  return total
}
