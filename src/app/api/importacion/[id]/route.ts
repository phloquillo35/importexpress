import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth"

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
      include: { store: { select: { id: true, name: true } } },
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

    const existing = await prisma.bulk.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: "Bulto no encontrado" }, { status: 404 })

    const data: Record<string, unknown> = {}

    if (body.status) data.status = body.status
    if (body.notes !== undefined) data.notes = body.notes
    if (body.totalCostUSD !== undefined) data.totalCostUSD = parseFloat(body.totalCostUSD)
    if (body.products) data.products = body.products

    if (body.status === "received" || body.status === "arrived") {
      const currentProducts = typeof existing.products === "string"
        ? JSON.parse(existing.products)
        : existing.products
      if (Array.isArray(currentProducts)) {
        for (const item of currentProducts) {
          if (item.productId && item.quantity) {
            await prisma.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            })
          }
        }
      }
    }

    const updated = await prisma.bulk.update({
      where: { id },
      data,
      include: { store: { select: { id: true, name: true } } },
    })

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
    }

    await prisma.bulk.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    console.error("Error deleting bulk:", error)
    return Response.json({ error: "Error al eliminar bulto" }, { status: 500 })
  }
}
