import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { requireRole } from "@/lib/auth"
import { computeOrderTotalARS } from "@/lib/pricing"
import { computeOrderStatus, recalculatePaymentStatus } from "@/lib/orders"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const { id, itemId } = await params

    const [order, item] = await Promise.all([
      prisma.order.findUnique({ where: { id } }),
      prisma.orderItem.findFirst({ where: { id: itemId, orderId: id } }),
    ])
    if (!order) return Response.json({ error: "Pedido no encontrado" }, { status: 404 })
    if (!item) return Response.json({ error: "Item no encontrado" }, { status: 404 })
    if (order.deletedAt) return Response.json({ error: "El pedido está eliminado" }, { status: 400 })
    if (item.bulkId) return Response.json({ error: "No se puede eliminar: el producto pertenece a un bulto" }, { status: 400 })

    const itemCount = await prisma.orderItem.count({ where: { orderId: id } })
    if (itemCount <= 1) {
      return Response.json({ error: "Un pedido debe tener al menos un producto. Eliminá el pedido completo si querés quitarlo" }, { status: 400 })
    }

    console.log(`[PEDIDO ITEM DELETE] orderId=${id} itemId=${itemId} product=${item.productName || item.productId} qty=${item.quantity}`)

    await prisma.$transaction(async (tx) => {
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
      await tx.orderItem.delete({ where: { id: itemId } })

      const remainingItems = await tx.orderItem.findMany({ where: { orderId: id } })
      const totalUSD = remainingItems.reduce((sum, i) => sum + i.priceUSD * i.quantity, 0)
      const totalARS = computeOrderTotalARS(
        { exchangeRate: order.exchangeRate, usdtRate: order.usdtRate, items: remainingItems },
        { exchangeRate: order.exchangeRate || 1350, usdtRate: order.usdtRate || 1400 }
      )

      await tx.order.update({
        where: { id },
        data: { totalUSD, totalARS },
      })
    })

    await recalculatePaymentStatus(id)

    const remainingItems = await prisma.orderItem.findMany({
      where: { orderId: id },
      select: { shippingStatus: true },
    })
    const status = computeOrderStatus(remainingItems)
    await prisma.order.update({ where: { id }, data: { status } })

    const updated = await prisma.order.findUnique({
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
        payments: {
          orderBy: { date: "desc" },
          select: { id: true, amountUSD: true, amountARS: true, concept: true, date: true },
        },
      },
    })
    if (!updated) return Response.json({ error: "Pedido no encontrado" }, { status: 404 })

    return Response.json(updated)
  } catch (error) {
    console.error("Error al eliminar item del pedido:", error)
    return Response.json({ error: "Error al eliminar item del pedido" }, { status: 500 })
  }
}