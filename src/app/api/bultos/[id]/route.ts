import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { calculateFinalPrice } from "@/lib/pricing"
import { requireAuth, requireRole } from "@/lib/auth"
import { updateBulkSchema } from "@/lib/validators"
import { sendEmail } from "@/lib/email"

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
            order: { select: { id: true, clientName: true, clientSurname: true, clientEmail: true } },
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

    if (body.status) data.status = body.status
    if (body.notes !== undefined) data.notes = body.notes
    if (body.trackingCode !== undefined) data.trackingCode = body.trackingCode
    if (body.totalCostUSD !== undefined) data.totalCostUSD = parseFloat(body.totalCostUSD)
    if (body.totalCostARS !== undefined && body.totalCostARS !== null) data.totalCostARS = parseFloat(body.totalCostARS)
    if (body.products) data.products = body.products
    if (body.type) data.type = body.type
    if (body.courier) data.courier = body.courier

    if (body.status === "en_camino" && body.trackingCode) {
      await prisma.orderItem.updateMany({
        where: { bulkId: id },
        data: { trackingCode: body.trackingCode, shippingStatus: "en_camino" },
      })
    }

    if (body.status) {
      await prisma.orderItem.updateMany({
        where: { bulkId: id },
        data: { shippingStatus: body.status },
      })

      const affectedOrderIds = await prisma.orderItem.findMany({
        where: { bulkId: id },
        select: { orderId: true },
        distinct: ["orderId"],
      })

      const statusPriority: Record<string, number> = {
        demorado: 0,
        cancelado: 1,
        pending: 2,
        en_camino: 3,
        llego: 4,
        entregado: 5,
      }

      for (const { orderId } of affectedOrderIds) {
        const items = await prisma.orderItem.findMany({
          where: { orderId },
          select: { shippingStatus: true },
        })

        let computed = "entregado"
        let minPrio = statusPriority[computed]
        for (const item of items) {
          const prio = statusPriority[item.shippingStatus] ?? 99
          if (prio < minPrio) {
            minPrio = prio
            computed = item.shippingStatus
          }
        }

        await prisma.order.update({
          where: { id: orderId },
          data: { status: computed },
        })
        console.log(`[BULK PUT] order ${orderId} recalculated -> ${computed} from ${items.length} items`)
      }

      const allBulksOnAffectedOrders = await prisma.orderItem.findMany({
        where: { orderId: { in: affectedOrderIds.map(o => o.orderId) } },
        select: { bulkId: true },
        distinct: ["bulkId"],
      })
      console.log(`[BULK PUT] bulks on affected orders: ${allBulksOnAffectedOrders.map(b => b.bulkId).join(", ")}`)
    }

    if (body.totalCostARS && existing.type) {
      const itemCount = await prisma.orderItem.count({ where: { bulkId: id } })
      if (itemCount > 0) {
        const shippingPerItem = parseFloat(body.totalCostARS) / itemCount
        const items = await prisma.orderItem.findMany({ where: { bulkId: id, productId: { not: null } },
          include: { product: true },
        })

        for (const item of items) {
          if (!item.productId || !item.product) continue
          const currentShipping = item.product.shippingCost || 0
          await prisma.product.update({
            where: { id: item.productId },
            data: { shippingCost: currentShipping + shippingPerItem },
          })
        }
      }
    }

    const updated = await prisma.bulk.update({
      where: { id },
      data,
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

    if (body.status === "en_camino" && body.trackingCode) {
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

    const statusPriority: Record<string, number> = {
      demorado: 0,
      cancelado: 1,
      pending: 2,
      en_camino: 3,
      llego: 4,
      entregado: 5,
    }

    for (const { orderId } of deletedItems) {
      const items = await prisma.orderItem.findMany({
        where: { orderId },
        select: { shippingStatus: true },
      })

      let computed = "entregado"
      let minPrio = statusPriority[computed]
      for (const item of items) {
        const prio = statusPriority[item.shippingStatus] ?? 99
        if (prio < minPrio) {
          minPrio = prio
          computed = item.shippingStatus
        }
      }

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
