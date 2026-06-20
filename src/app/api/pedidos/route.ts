import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { genId } from "@/lib/utils"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: { product: { select: { name: true, slug: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return Response.json(orders)
  } catch (error) {
    console.error("Error fetching orders:", error)
    return Response.json({ error: "Error al cargar pedidos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clientName, clientContact, items, totalUSD, totalARS, notes } = body

    if (!clientName || !items || !items.length) {
      return Response.json({ error: "clientName y items son requeridos" }, { status: 400 })
    }

    const order = await prisma.order.create({
      data: {
        id: genId(),
        clientName,
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
        items: {
          include: { product: { select: { name: true } } },
        },
      },
    })

    return Response.json(order, { status: 201 })
  } catch (error) {
    console.error("Error creating order:", error)
    return Response.json({ error: "Error al crear pedido" }, { status: 500 })
  }
}
