import { describe, it, expect } from "vitest"
import { calculateFinalPrice, getItemEffectivePricing, computeOrderTotalARS } from "@/lib/pricing"

describe("calculateFinalPrice", () => {
  it("computes a simple case with percentage yoni and percentage profit", () => {
    // costo 100 USDT, +10% logística (yoni), +$1000 ARS envío, +20% ganancia
    const result = calculateFinalPrice({
      costUSDT: 100,
      yoniEnabled: true,
      yoniType: "percentage",
      yoniValue: 10,
      shippingCost: 1000,
      profitType: "percentage",
      profitValue: 20,
      exchangeRate: 1000,
      usdtRate: 1000,
    })
    // base = 100 + 10 = 110 USDT -> 110.000 ARS + 1000 envío = 111.000 subtotal
    // ganancia 20% de 111.000 = 22.200 -> final 133.200 ARS
    expect(result.subtotalARS).toBe(111000)
    expect(result.profitARS).toBe(22200)
    expect(result.finalPriceARS).toBe(133200)
    expect(result.finalPriceUSD).toBe(133.2)
    expect(result.yoniUSDT).toBe(10)
  })

  it("supports fixed_usdt yoni and fixed_ars profit", () => {
    const result = calculateFinalPrice({
      costUSDT: 50,
      yoniEnabled: true,
      yoniType: "fixed_usdt",
      yoniValue: 5,
      shippingCost: 0,
      profitType: "fixed_ars",
      profitValue: 3000,
      exchangeRate: 1000,
      usdtRate: 1000,
    })
    // base = 50 + 5 = 55 USDT -> 55.000 ARS subtotal, + 3.000 fijo = 58.000
    expect(result.subtotalARS).toBe(55000)
    expect(result.finalPriceARS).toBe(58000)
  })

  it("supports fixed_ars yoni (convertido a USDT con usdtRate) y fixed_usdt profit", () => {
    const result = calculateFinalPrice({
      costUSDT: 20,
      yoniEnabled: true,
      yoniType: "fixed_ars",
      yoniValue: 2000, // 2000 ARS / usdtRate 1000 = 2 USDT
      shippingCost: 0,
      profitType: "fixed_usdt",
      profitValue: 10,
      exchangeRate: 1000,
      usdtRate: 1000,
    })
    expect(result.yoniUSDT).toBe(2)
    // base = 22 USDT -> 22.000 ARS + profit fijo 10 USDT * 1000 = 10.000 -> 32.000
    expect(result.finalPriceARS).toBe(32000)
  })

  it("never divides by zero/negative rates (evita Infinity/NaN)", () => {
    const result = calculateFinalPrice({
      costUSDT: 100,
      yoniEnabled: false,
      yoniType: "percentage",
      yoniValue: 0,
      shippingCost: 0,
      profitType: "percentage",
      profitValue: 10,
      exchangeRate: 0,
      usdtRate: -5,
    })
    expect(Number.isFinite(result.finalPriceARS)).toBe(true)
    expect(Number.isFinite(result.finalPriceUSD)).toBe(true)
    expect(Number.isNaN(result.finalPriceARS)).toBe(false)
  })

  it("no aplica yoni cuando yoniEnabled es false aunque yoniValue > 0", () => {
    const result = calculateFinalPrice({
      costUSDT: 100,
      yoniEnabled: false,
      yoniType: "percentage",
      yoniValue: 50,
      shippingCost: 0,
      profitType: "percentage",
      profitValue: 0,
      exchangeRate: 1000,
      usdtRate: 1000,
    })
    expect(result.yoniUSDT).toBe(0)
    expect(result.subtotalARS).toBe(100000)
  })
})

describe("getItemEffectivePricing", () => {
  const baseItem = {
    quantity: 3,
    costUSDT: 100,
    yoniEnabled: true,
    yoniType: "percentage" as const,
    yoniValue: 10,
    shippingCost: 500,
    profitType: "percentage" as const,
    profitValue: 20,
  }

  it("multiplica el precio por unidad por la cantidad cuando no hay overrides", () => {
    const perUnit = calculateFinalPrice({ ...baseItem, exchangeRate: 1000, usdtRate: 1000 })
    const eff = getItemEffectivePricing(baseItem, 1000, 1000)

    expect(eff.overridden).toBe(false)
    expect(eff.finalPriceARS).toBe(Math.round(perUnit.finalPriceARS * 3))
    expect(eff.costUSDT).toBe(300) // costo total (por unidad * cantidad)
    expect(eff.shippingCost).toBe(1500) // envío total (por unidad * cantidad)
  })

  it("respeta los overrides manuales en vez de recalcular", () => {
    const eff = getItemEffectivePricing(
      { ...baseItem, finalPriceARS: 999999, subtotalARS: 111 },
      1000,
      1000,
    )
    expect(eff.overridden).toBe(true)
    expect(eff.finalPriceARS).toBe(999999)
    expect(eff.subtotalARS).toBe(111)
    // profitARS no fue overrideado, se sigue calculando
    expect(eff.overridden).toBe(true)
  })

  it("el envío de un ítem editado por un bulto (por unidad) se refleja multiplicado por la cantidad", () => {
    // Simula lo que hace la distribución de costo de un bulto: shippingPerItem / quantity
    const shippingPerLine = 3000
    const quantity = 4
    const perUnitShipping = shippingPerLine / quantity
    const eff = getItemEffectivePricing(
      { ...baseItem, quantity, shippingCost: perUnitShipping },
      1000,
      1000,
    )
    expect(eff.shippingCost).toBeCloseTo(shippingPerLine, 5)
  })
})

describe("computeOrderTotalARS", () => {
  it("suma el finalPriceARS de todos los items usando la tasa del pedido", () => {
    const order = {
      exchangeRate: 1000,
      usdtRate: 1000,
      items: [
        { quantity: 1, costUSDT: 100, yoniEnabled: false, yoniType: "percentage", yoniValue: 0, shippingCost: 0, profitType: "percentage", profitValue: 10 },
        { quantity: 2, costUSDT: 50, yoniEnabled: false, yoniType: "percentage", yoniValue: 0, shippingCost: 0, profitType: "percentage", profitValue: 10 },
      ],
    }
    // item1: 100.000 * 1.10 = 110.000
    // item2: 50.000 * 1.10 = 55.000 * 2 = 110.000
    expect(computeOrderTotalARS(order)).toBe(220000)
  })

  it("usa las tasas por default cuando el pedido no tiene las propias", () => {
    const order = {
      exchangeRate: 0,
      usdtRate: 0,
      items: [
        { quantity: 1, costUSDT: 10, yoniEnabled: false, yoniType: "percentage", yoniValue: 0, shippingCost: 0, profitType: "percentage", profitValue: 0 },
      ],
    }
    const total = computeOrderTotalARS(order, { exchangeRate: 1350, usdtRate: 1400 })
    expect(total).toBe(14000) // 10 * 1400
  })
})
