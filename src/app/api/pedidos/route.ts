import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { genId } from "@/lib/utils"
import { requireAuth } from "@/lib/auth"
import { createOrderSchema } from "@/lib/validators"

const statusOrder: Record<string, number> = {
  pending: 0,
  en_camino: 1,
  demorado: 2,
  llego: 3,
  entregado: 4,
  cancelado: 5,
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (session instanceof Response) return session

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const orders = await prisma.order.findMany({
      where,
      include: {
        distributor: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { name: true, slug: true } }, bulk: { select: { courier: true, trackingCode: true, type: true } } },
        },
      },
    })

    const sorted = orders.sort((a, b) => {
      const aOrder = statusOrder[a.status] ?? 99
      const bOrder = statusOrder[b.status] ?? 99
      if (aOrder !== bOrder) return aOrder - bOrder
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return Response.json(sorted)
  } catch (error) {
    console.error("Error fetching orders:", error)
    return Response.json({ error: "Error al cargar pedidos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth()
    if (session instanceof Response) return session

    const body = await request.json()
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
    }

    const { clientName, clientSurname, clientPhone, clientEmail, distributorId, clientContact, items, totalUSD, totalARS, notes } = body

    if (!clientName || !items || !items.length) {
      return Response.json({ error: "clientName y items son requeridos" }, { status: 400 })
    }

    const order = await prisma.order.create({
      data: {
        id: genId(),
        clientName,
        clientSurname: clientSurname || "",
        clientPhone: clientPhone || "",
        clientEmail: clientEmail || "",
        distributorId: distributorId || null,
        clientContact: clientContact || "",
        totalUSD: parseFloat(totalUSD) || 0,
        totalARS: totalARS ? parseFloat(totalARS) : null,
        notes: notes || null,
        items: {
          create: items.map((item: { productId: string; quantity: number; priceUSD: number }) => ({
            id: genId(),
            productId: item.productId,
            quantity: item.quantity,
            priceUSD: item.priceUSD,
          })),
        },
      },
      include: {
        distributor: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { name: true } }, bulk: { select: { courier: true, trackingCode: true, type: true } } },
        },
      },
    })

    return Response.json(order, { status: 201 })
  } catch (error) {
    console.error("Error creating order:", error)
    return Response.json({ error: "Error al crear pedido" }, { status: 500 })
  }
}
