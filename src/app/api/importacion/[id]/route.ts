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
      include: { distributor: { select: { id: true, name: true } } },
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
      include: { distributor: { select: { id: true, name: true } } },
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
