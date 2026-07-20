import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth"
import { updateOrderSchema, registerPaymentSchema } from "@/lib/validators"
import { genId } from "@/lib/utils"
import { computeOrderTotalARS } from "@/lib/pricing"

async function getSettings() {
  const [er, ur] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "exchange_rate" } }),
    prisma.setting.findUnique({ where: { key: "usdt_rate" } }),
  ])
  return {
    exchangeRate: parseFloat(er?.value || "1350"),
    usdtRate: parseFloat(ur?.value || "1400"),
  }
}

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
        payments: {
          orderBy: { date: "desc" },
          select: { id: true, amountUSD: true, amountARS: true, concept: true, date: true },
        },
      },
    })
    if (!order) return Response.json({ error: "Pedido no encontrado" }, { status: 404 })
    const defaults = await getSettings()
    return Response.json({
      ...order,
      totalARS: order.totalARS ?? computeOrderTotalARS(order, defaults),
    })
  } catch (error) {
    console.error("Error fetching order:", error)
    return Response.json({ error: "Error al cargar pedido" }, { status: 500 })
  }
}

async function recalculatePaymentStatus(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { totalUSD: true } })
  if (!order) return

  const agg = await prisma.transaction.aggregate({
    where: { orderId },
    _sum: { amountUSD: true },
  })
  const totalPaid = agg._sum.amountUSD ?? 0

  let paymentStatus: string
  if (totalPaid <= 0) paymentStatus = "debe"
  else if (totalPaid < order.totalUSD) paymentStatus = "seña"
  else paymentStatus = "pagado"

  await prisma.order.update({
    where: { id: orderId },
    data: { amountPaidUSD: totalPaid, paymentStatus },
  })
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
    const existing = await prisma.order.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: "Pedido no encontrado" }, { status: 404 })

    if (body.payment) {
      const parsed = registerPaymentSchema.safeParse(body.payment)
      if (!parsed.success) {
        return Response.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
      }
      const { amount, currency, concept } = parsed.data
      let amountUSD = amount
      let amountARS: number | null = null
      if (currency === "ARS") {
        amountUSD = amount / (existing.exchangeRate || 1)
        amountARS = amount
      }
      await prisma.transaction.create({
        data: {
          id: genId(),
          type: "income",
          concept: concept || `Pago pedido #${existing.internalNumber} — ${existing.clientName}`,
          amountUSD,
          amountARS,
          orderId: id,
          date: new Date(),
        },
      })
      await recalculatePaymentStatus(id)
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
      return Response.json(updated)
    }

    const parsed = updateOrderSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (body.status) data.status = body.status
    if (body.notes !== undefined) data.notes = body.notes
    if (body.clientName) data.clientName = body.clientName
    if (body.clientSurname !== undefined) data.clientSurname = body.clientSurname
    if (body.clientPhone !== undefined) data.clientPhone = body.clientPhone
    if (body.clientEmail !== undefined) data.clientEmail = body.clientEmail
    if (body.storeId !== undefined) data.storeId = body.storeId
    if (body.clientContact !== undefined) data.clientContact = body.clientContact

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

    await prisma.order.update({ where: { id }, data: { deletedAt: new Date() } })
    return Response.json({ success: true })
  } catch (error) {
    console.error("Error deleting order:", error)
    return Response.json({ error: "Error al eliminar pedido" }, { status: 500 })
  }
}
