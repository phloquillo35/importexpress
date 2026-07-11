import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth"
import { updateOrderSchema } from "@/lib/validators"
import { genId } from "@/lib/utils"

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
    if (body.status) {
      data.status = body.status
    }
    if (body.notes !== undefined) data.notes = body.notes
    if (body.clientName) data.clientName = body.clientName
    if (body.clientSurname !== undefined) data.clientSurname = body.clientSurname
    if (body.clientPhone !== undefined) data.clientPhone = body.clientPhone
    if (body.clientEmail !== undefined) data.clientEmail = body.clientEmail
    if (body.storeId !== undefined) data.storeId = body.storeId
    if (body.clientContact !== undefined) data.clientContact = body.clientContact
    if (body.paymentStatus !== undefined) data.paymentStatus = body.paymentStatus
    if (body.amountPaidUSD !== undefined) data.amountPaidUSD = body.amountPaidUSD

    const updated = await prisma.order.update({
      where: { id },
      data,
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

    if (body.paymentStatus && body.amountPaidUSD && body.amountPaidUSD > 0) {
      const prevStatus = existing.paymentStatus
      const prevAmount = existing.amountPaidUSD
      const changed = body.paymentStatus !== prevStatus || body.amountPaidUSD !== prevAmount
      if (changed) {
        const concept = `Pago pedido #${existing.internalNumber} — ${existing.clientName}${body.paymentStatus === "deposit" ? " (seña)" : ""}`
        await prisma.transaction.create({
          data: {
            id: genId(),
            type: "income",
            concept,
            amountUSD: body.amountPaidUSD,
            date: new Date(),
          },
        })
      }
    }

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

    console.log(`[PEDIDO DELETE] id=${id} client=${existing.clientName} ${existing.clientSurname} total=${existing.totalUSD} status=${existing.status}`)

    const deletedItems = await prisma.orderItem.findMany({
      where: { orderId: id },
      select: { id: true, productId: true, quantity: true },
    })
    console.log(`[PEDIDO DELETE] deleting ${deletedItems.length} items: ${deletedItems.map(i => `${i.productId}x${i.quantity}`).join(", ")}`)

    await prisma.orderItem.deleteMany({ where: { orderId: id } })
    await prisma.order.delete({ where: { id } })
    console.log(`[PEDIDO DELETE] order ${id} deleted successfully`)
    return Response.json({ success: true })
  } catch (error) {
    console.error("Error deleting order:", error)
    return Response.json({ error: "Error al eliminar pedido" }, { status: 500 })
  }
}
