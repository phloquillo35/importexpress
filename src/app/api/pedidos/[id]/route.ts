import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { select: { name: true, slug: true, images: true } } },
        },
      },
    })
    if (!order) return Response.json({ error: "Pedido no encontrado" }, { status: 404 })
    return Response.json(order)
  } catch (error) {
    console.error("Error fetching order:", error)
    return Response.json({ error: "Error al cargar pedido" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.order.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: "Pedido no encontrado" }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (body.status) data.status = body.status
    if (body.notes !== undefined) data.notes = body.notes

    const updated = await prisma.order.update({
      where: { id },
      data,
      include: {
        items: {
          include: { product: { select: { name: true } } },
        },
      },
    })
    return Response.json(updated)
  } catch (error) {
    console.error("Error updating order:", error)
    return Response.json({ error: "Error al actualizar pedido" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await prisma.order.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: "Pedido no encontrado" }, { status: 404 })

    await prisma.orderItem.deleteMany({ where: { orderId: id } })
    await prisma.order.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    console.error("Error deleting order:", error)
    return Response.json({ error: "Error al eliminar pedido" }, { status: 500 })
  }
}
