import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { getItemEffectivePricing } from "@/lib/pricing"
import { requireAuth, requireRole } from "@/lib/auth"
import { updateBulkSchema } from "@/lib/validators"
import { sendEmail } from "@/lib/email"
import { computeOrderStatus } from "@/lib/orders"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    if (session instanceof Response) return session

    const { id } = await params
    const bulk = await prisma.bulk.findUnique({
      where: { id },
      include: {
        store: { select: { id: true, name: true } },
        orderItems: {
          include: {
            order: { select: { id: true, internalNumber: true, clientName: true, clientSurname: true, clientEmail: true } },
            product: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    })
    if (!bulk) return Response.json({ error: "Bulto no encontrado" }, { status: 404 })
    return Response.json({
      ...bulk,
      products: typeof bulk.products === "string" ? JSON.parse(bulk.products) : bulk.products,
    })
  } catch (error) {
    console.error("Error fetching bulk:", error)
    return Response.json({ error: "Error al cargar bulto" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const { id } = await params
    const body = await request.json()
    const parsed = updateBulkSchema.safeParse(body)
    if (!parsed.success) {
      console.error("[BULK PUT] validation error", JSON.stringify(parsed.error.issues))
      return Response.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
    }

    const existing = await prisma.bulk.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: "Bulto no encontrado" }, { status: 404 })

    console.log(`[BULK PUT] id=${id} body=${JSON.stringify(body)} existing.status=${existing.status} existing.trackingCode=${existing.trackingCode}`)

    const data: Record<string, unknown> = {}

    if (body.status !== undefined) data.status = body.status
    if (body.notes !== undefined) data.notes = body.notes
    if (body.trackingCode !== undefined) data.trackingCode = body.trackingCode
    if (body.totalCostUSD !== undefined) data.totalCostUSD = parseFloat(body.totalCostUSD)
    if (body.totalCostARS !== undefined && body.totalCostARS !== null) data.totalCostARS = parseFloat(body.totalCostARS)
    if (body.products !== undefined) data.products = body.products
    if (body.type !== undefined) data.type = body.type
    if (body.courier !== undefined) data.courier = body.courier

    if (body.totalCostARS !== undefined && body.totalCostARS !== null) {
      const numericCost = parseFloat(body.totalCostARS)
      if (isNaN(numericCost) || !isFinite(numericCost) || numericCost < 0) {
        return Response.json({ error: "totalCostARS debe ser un número positivo" }, { status: 400 })
      }
    }

    const hasStatusChange = !!body.status
    const hasCostChange = body.totalCostARS !== undefined && body.totalCostARS !== null

    await prisma.$transaction(async (tx) => {
      if (hasStatusChange) {
        const trackingCode = body.trackingCode || null

        if (trackingCode) {
          await tx.orderItem.updateMany({
            where: { bulkId: id },
            data: { trackingCode, shippingStatus: "en_camino" },
          })
        } else {
          await tx.orderItem.updateMany({
            where: { bulkId: id },
            data: { shippingStatus: body.status },
          })
        }

        const affectedOrderIds = await tx.orderItem.findMany({
          where: { bulkId: id },
          select: { orderId: true },
          distinct: ["orderId"],
        })

        for (const { orderId } of affectedOrderIds) {
          const items = await tx.orderItem.findMany({
            where: { orderId },
            select: { shippingStatus: true },
          })
          const computed = computeOrderStatus(items)
          await tx.order.update({
            where: { id: orderId },
            data: { status: computed },
          })
          console.log(`[BULK PUT] order ${orderId} recalculated -> ${computed} from ${items.length} items`)
        }
      }

      if (hasCostChange) {
        const numericCost = parseFloat(body.totalCostARS)
        // El costo de envío del bulto se reparte entre sus ítems y se guarda en
        // OrderItem.shippingCost (el snapshot propio del pedido) — nunca en
        // Product.shippingCost, que es la plantilla de precio del catálogo y no
        // tiene relación con lo que efectivamente costó ESTE envío. Tocar el
        // producto hacía que el cambio no se reflejara en el pedido y además
        // corrompía el precio de catálogo para pedidos futuros no relacionados.
        const items = await tx.orderItem.findMany({ where: { bulkId: id } })
        if (items.length > 0) {
          const shippingPerItem = numericCost / items.length
          const affectedOrderIds = new Set<string>()

          for (const item of items) {
            const perUnit = item.quantity > 0 ? shippingPerItem / item.quantity : shippingPerItem
            await tx.orderItem.update({
              where: { id: item.id },
              data: { shippingCost: Math.max(0, perUnit) },
            })
            affectedOrderIds.add(item.orderId)
          }

          for (const orderId of affectedOrderIds) {
            const order = await tx.order.findUnique({ where: { id: orderId }, select: { exchangeRate: true, usdtRate: true, amountPaidUSD: true } })
            if (!order) continue
            const orderItems = await tx.orderItem.findMany({ where: { orderId } })
            let totalUSD = 0
            let totalARS = 0
            for (const it of orderItems) {
              const eff = getItemEffectivePricing(it, order.exchangeRate || 1350, order.usdtRate || 1400)
              totalUSD += eff.finalPriceUSD
              totalARS += eff.finalPriceARS
            }
            totalUSD = Math.round(totalUSD * 100) / 100
            totalARS = Math.round(totalARS)
            const paidUSD = order.amountPaidUSD || 0
            const paymentStatus = paidUSD <= 0 ? "debe" : paidUSD < totalUSD ? "seña" : "pagado"
            await tx.order.update({ where: { id: orderId }, data: { totalUSD, totalARS, paymentStatus } })
          }

          data.lastShippingPerItem = shippingPerItem
        }
      }

      await tx.bulk.update({
        where: { id },
        data,
      })
    })

    const updated = await prisma.bulk.findUnique({
      where: { id },
      include: {
        store: { select: { id: true, name: true } },
        orderItems: {
          include: {
            order: { select: { id: true, clientName: true, clientSurname: true, clientEmail: true } },
            product: { select: { id: true, name: true } },
          },
        },
      },
    })
    if (!updated) return Response.json({ error: "Bulto no encontrado" }, { status: 404 })

    if (body.status === "en_camino" && body.trackingCode && existing.status !== "en_camino") {
      const orderItems = await prisma.orderItem.findMany({
        where: { bulkId: id },
        include: { order: true },
      })

      const courier = body.courier || existing.courier || "N/A"
      const emailed = new Set<string>()
      for (const item of orderItems) {
        if (item.order.clientEmail && !emailed.has(item.order.clientEmail)) {
          emailed.add(item.order.clientEmail)
          sendEmail({
            to: item.order.clientEmail,
            subject: "Tu pedido está en camino — ImportExpress",
            text: `Hola ${item.order.clientName || "cliente"}, tu pedido ya está en camino.\n\nCódigo de seguimiento: ${body.trackingCode}\nCourier: ${courier}\n\nGracias por confiar en ImportExpress.`,
          }).catch(console.error)
        }
      }
    }

    return Response.json({
      ...updated,
      products: typeof updated.products === "string" ? JSON.parse(updated.products) : updated.products,
    })
  } catch (error) {
    console.error("Error updating bulk:", error)
    return Response.json({ error: "Error al actualizar bulto" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const { id } = await params
    const existing = await prisma.bulk.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: "Bulto no encontrado" }, { status: 404 })

    console.log(`[BULK DELETE] id=${id} tracking=${existing.trackingCode} status=${existing.status} type=${existing.type}`)

    const deletedItems = await prisma.orderItem.findMany({
      where: { bulkId: id },
      select: { orderId: true },
      distinct: ["orderId"],
    })

    await prisma.orderItem.updateMany({
      where: { bulkId: id },
      data: { bulkId: null, trackingCode: null, shippingStatus: "pending", bulkType: null },
    })

    for (const { orderId } of deletedItems) {
      const items = await prisma.orderItem.findMany({
        where: { orderId },
        select: { shippingStatus: true },
      })

      const computed = computeOrderStatus(items)

      await prisma.order.update({
        where: { id: orderId },
        data: { status: computed },
      })
      console.log(`[BULK DELETE] order ${orderId} recalculated -> ${computed}`)
    }

    console.log(`[BULK DELETE] soft deleted bulk ${id} success`)
    await prisma.bulk.update({ where: { id }, data: { deletedAt: new Date() } })
    return Response.json({ success: true })
  } catch (error) {
    console.error("Error deleting bulk:", error)
    return Response.json({ error: "Error al eliminar bulto" }, { status: 500 })
  }
}
