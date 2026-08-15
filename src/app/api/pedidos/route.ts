import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { genId } from "@/lib/utils"
import { requireAuth, requireRole } from "@/lib/auth"
import { createOrderSchema } from "@/lib/validators"
import { calculateFinalPrice, computeOrderTotalARS, type PricingInput } from "@/lib/pricing"
import { STATUS_PRIORITY } from "@/lib/orders"

const statusOrder: Record<string, number> = STATUS_PRIORITY

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (session instanceof Response) return session

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const showDeleted = searchParams.get("showDeleted") === "true"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")))
    const skip = (page - 1) * limit

    const search = searchParams.get("search") || ""

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (!showDeleted) where.deletedAt = null
    if (search) {
      const statusByLabel: Record<string, string> = {
        pendiente: "pending",
        "en camino": "en_camino",
        demorado: "demorado",
        llegó: "llego",
        llego: "llego",
        entregado: "entregado",
        cancelado: "cancelado",
      }
      const cleanNumber = search.replace(/[$]/g, "").trim()
      const searchNumber = parseFloat(cleanNumber.replace(/\./g, ""))
      const isNumeric = !isNaN(searchNumber) && /^[\d.,$]+$/.test(cleanNumber)
      const statusMatch = statusByLabel[search.toLowerCase()]

      const or: Record<string, unknown>[] = [
        { clientName: { contains: search, mode: "insensitive" } },
        { clientSurname: { contains: search, mode: "insensitive" } },
        { clientPhone: { contains: search, mode: "insensitive" } },
        { clientContact: { contains: search, mode: "insensitive" } },
        { clientEmail: { contains: search, mode: "insensitive" } },
        { items: { some: { productName: { contains: search, mode: "insensitive" } } } },
        { store: { name: { contains: search, mode: "insensitive" } } },
      ]
      if (statusMatch) or.push({ status: statusMatch })
      if (isNumeric) {
        if (Number.isInteger(searchNumber)) or.push({ internalNumber: searchNumber })
        or.push({ totalUSD: { gte: searchNumber - 1, lte: searchNumber + 1 } })
      }
      where.OR = or
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
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
      }),
    ])

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

    return Response.json({ orders: enriched, total, page, limit })
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

    const stockProductIds = items.map((item: { productId: string }) => item.productId)
    const stockProducts = await prisma.product.findMany({
      where: { id: { in: stockProductIds } },
      select: { id: true, stock: true },
    })
    const stockMap = new Map(stockProducts.map((p) => [p.id, p.stock]))
    for (const item of items) {
      const available = stockMap.get(item.productId) ?? 0
      if (available < item.quantity) {
        return Response.json({ error: `Stock insuficiente para producto ${item.productId}: disponible ${available}, requerido ${item.quantity}` }, { status: 400 })
      }
    }

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
      color: string | null; storage: string | null
    }> = items.map((item: { productId: string; quantity: number; priceUSD: number; color?: string; storage?: string }) => {
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
        color: item.color ?? null,
        storage: item.storage ?? null,
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

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
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

      await Promise.all(
        items.map((item: { productId: string; quantity: number }) =>
          tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          })
        )
      )

      return created
    })

    return Response.json(order, { status: 201 })
  } catch (error) {
    console.error("Error creating order:", error)
    return Response.json({ error: "Error al crear pedido" }, { status: 500 })
  }
}