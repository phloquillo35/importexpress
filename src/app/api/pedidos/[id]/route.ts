import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth"
import { updateOrderSchema } from "@/lib/validators"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    if (session instanceof Response) return session

    const { id } = await params
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        distributor: { select: { id: true, name: true } },
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
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const { id } = await params
    const body = await request.json()
    const parsed = updateOrderSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
    }

    const existing = await prisma.order.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: "Pedido no encontrado" }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (body.status) data.status = body.status
    if (body.notes !== undefined) data.notes = body.notes
    if (body.clientName) data.clientName = body.clientName
    if (body.clientSurname !== undefined) data.clientSurname = body.clientSurname
    if (body.clientPhone !== undefined) data.clientPhone = body.clientPhone
    if (body.clientEmail !== undefined) data.clientEmail = body.clientEmail
    if (body.distributorId !== undefined) data.distributorId = body.distributorId
    if (body.clientContact !== undefined) data.clientContact = body.clientContact

    const updated = await prisma.order.update({
      where: { id },
      data,
      include: {
        distributor: { select: { id: true, name: true } },
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
    const session = await requireRole("admin")
    if (session instanceof Response) return session

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
