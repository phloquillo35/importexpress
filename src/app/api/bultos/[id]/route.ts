import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { calculateFinalPrice } from "@/lib/pricing"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const bulk = await prisma.bulk.findUnique({
      where: { id },
      include: {
        distributor: { select: { id: true, name: true } },
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
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.bulk.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: "Bulto no encontrado" }, { status: 404 })

    const data: Record<string, unknown> = {}

    if (body.status) data.status = body.status
    if (body.notes !== undefined) data.notes = body.notes
    if (body.trackingCode !== undefined) data.trackingCode = body.trackingCode
    if (body.totalCostUSD !== undefined) data.totalCostUSD = parseFloat(body.totalCostUSD)
    if (body.totalCostARS !== undefined) data.totalCostARS = body.totalCostARS ? parseFloat(body.totalCostARS) : null
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
    }

    if (body.totalCostARS && existing.type) {
      const itemCount = await prisma.orderItem.count({ where: { bulkId: id } })
      if (itemCount > 0) {
        const shippingPerItem = parseFloat(body.totalCostARS) / itemCount
        const items = await prisma.orderItem.findMany({
          where: { bulkId: id },
          include: { product: true },
        })

        for (const item of items) {
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
        distributor: { select: { id: true, name: true } },
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

      const emailed = new Set<string>()
      for (const item of orderItems) {
        if (item.order.clientEmail && !emailed.has(item.order.clientEmail)) {
          emailed.add(item.order.clientEmail)
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
    const { id } = await params
    const existing = await prisma.bulk.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: "Bulto no encontrado" }, { status: 404 })

    await prisma.orderItem.updateMany({
      where: { bulkId: id },
      data: { bulkId: null, trackingCode: null, shippingStatus: "pending", bulkType: null },
    })

    await prisma.bulk.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    console.error("Error deleting bulk:", error)
    return Response.json({ error: "Error al eliminar bulto" }, { status: 500 })
  }
}
