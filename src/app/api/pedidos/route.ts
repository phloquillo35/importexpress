import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { genId } from "@/lib/utils"
import { requireAuth, requireRole } from "@/lib/auth"
import { createOrderSchema } from "@/lib/validators"
import { calculateFinalPrice, computeOrderTotalARS, type PricingInput } from "@/lib/pricing"

const statusOrder: Record<string, number> = {
  pending: 0,
  en_camino: 1,
  demorado: 2,
  llego: 3,
  entregado: 4,
  cancelado: 5,
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (session instanceof Response) return session

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const showDeleted = searchParams.get("showDeleted") === "true"

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (!showDeleted) where.deletedAt = null

    const orders = await prisma.order.findMany({
      where,
      include: {
        store: { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              select: {
                name: true, slug: true, images: true, categoryId: true, stock: true,
                costUSDT: true, priceUSD: true, finalPriceUSD: true, finalPriceARS: true,
                yoniEnabled: true, yoniType: true, yoniValue: true,
                shippingCost: true, profitType: true, profitValue: true,
              },
            },
            bulk: { select: { courier: true, trackingCode: true, type: true } },
          },
        },
      },
    })

    const sorted = orders.sort((a, b) => {
      const aOrder = statusOrder[a.status] ?? 99
      const bOrder = statusOrder[b.status] ?? 99
      if (aOrder !== bOrder) return aOrder - bOrder
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    const [exchangeRateSetting, usdtRateSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "exchange_rate" } }),
      prisma.setting.findUnique({ where: { key: "usdt_rate" } }),
    ])
    const defaultExchangeRate = parseFloat(exchangeRateSetting?.value || "1350")
    const defaultUsdtRate = parseFloat(usdtRateSetting?.value || "1400")

    const enriched = sorted.map((order) => ({
      ...order,
      totalARS: order.totalARS ?? computeOrderTotalARS(order, { exchangeRate: defaultExchangeRate, usdtRate: defaultUsdtRate }),
    }))

    return Response.json(enriched)
  } catch (error) {
    console.error("Error fetching orders:", error)
    return Response.json({ error: "Error al cargar pedidos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const body = await request.json()
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) {
      console.error("[PEDIDO POST] validation error", JSON.stringify(parsed.error.issues))
      return Response.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
    }

    const { clientName, clientSurname, clientPhone, clientEmail, storeId, clientContact, items, totalUSD, totalARS, notes } = body

    if (!clientName || !items || !items.length) {
      return Response.json({ error: "clientName y items son requeridos" }, { status: 400 })
    }

    const [exchangeRateSetting, usdtRateSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "exchange_rate" } }),
      prisma.setting.findUnique({ where: { key: "usdt_rate" } }),
    ])
    const exchangeRate = parseFloat(exchangeRateSetting?.value || "1350")
    const usdtRate = parseFloat(usdtRateSetting?.value || "1400")

    const productIds = items.map((item: { productId: string }) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true, name: true, slug: true, costUSDT: true, yoniEnabled: true, yoniType: true, yoniValue: true,
        shippingCost: true, profitType: true, profitValue: true,
      },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    const orderItems: Array<{
      id: string; productId: string; quantity: number; priceUSD: number
      costUSDT: number | null; yoniEnabled: boolean; yoniType: string; yoniValue: number
      shippingCost: number; profitType: string; profitValue: number
      productName: string | null; productSlug: string | null
    }> = items.map((item: { productId: string; quantity: number; priceUSD: number }) => {
      const product = productMap.get(item.productId)
      return {
        id: genId(),
        productId: item.productId,
        quantity: item.quantity,
        priceUSD: item.priceUSD ?? 0,
        costUSDT: product?.costUSDT ?? null,
        yoniEnabled: product?.yoniEnabled ?? false,
        yoniType: product?.yoniType ?? "percentage",
        yoniValue: product?.yoniValue ?? 25,
        shippingCost: product?.shippingCost ?? 0,
        profitType: product?.profitType ?? "percentage",
        profitValue: product?.profitValue ?? 0,
        productName: product?.name ?? null,
        productSlug: product?.slug ?? null,
      }
    })

    let computedTotalARS = 0
    for (const item of orderItems) {
      const pricing = calculateFinalPrice({
        costUSDT: item.costUSDT ?? 0,
        yoniEnabled: item.yoniEnabled,
        yoniType: item.yoniType as PricingInput["yoniType"],
        yoniValue: item.yoniValue,
        shippingCost: item.shippingCost,
        profitType: item.profitType as PricingInput["profitType"],
        profitValue: item.profitValue,
        exchangeRate,
        usdtRate,
      })
      computedTotalARS += pricing.finalPriceARS * item.quantity
    }

    const order = await prisma.order.create({
      data: {
        id: genId(),
        clientName,
        clientSurname: clientSurname || "",
        clientPhone: clientPhone || "",
        clientEmail: clientEmail || "",
        storeId: storeId || null,
        clientContact: clientContact || "",
        totalUSD: parseFloat(totalUSD) || 0,
        totalARS: computedTotalARS,
        notes: notes || null,
        exchangeRate,
        usdtRate,
        items: { create: orderItems },
      },
      include: {
        store: { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              select: {
                name: true, slug: true, images: true, categoryId: true, stock: true,
                costUSDT: true, priceUSD: true, finalPriceUSD: true, finalPriceARS: true,
                yoniEnabled: true, yoniType: true, yoniValue: true,
                shippingCost: true, profitType: true, profitValue: true,
              },
            },
            bulk: { select: { courier: true, trackingCode: true, type: true } },
          },
        },
      },
    })

    return Response.json(order, { status: 201 })
  } catch (error) {
    console.error("Error creating order:", error)
    return Response.json({ error: "Error al crear pedido" }, { status: 500 })
  }
}
