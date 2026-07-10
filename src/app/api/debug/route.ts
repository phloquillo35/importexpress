import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await requireAuth()
    if (session instanceof Response) return session

    const [bulkCount, orderCount, orderItemCount] = await Promise.all([
      prisma.bulk.count(),
      prisma.order.count(),
      prisma.orderItem.count(),
    ])

    const bulks = await prisma.bulk.findMany({
      select: { id: true, type: true, courier: true, trackingCode: true, status: true, date: true },
      orderBy: { date: "desc" },
      take: 20,
    })

    const orders = await prisma.order.findMany({
      select: { id: true, clientName: true, clientSurname: true, totalUSD: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    return Response.json({
      counts: { bulks: bulkCount, orders: orderCount, orderItems: orderItemCount },
      recentBulks: bulks,
      recentOrders: orders,
    })
  } catch (error) {
    console.error("Error in debug endpoint:", error)
    return Response.json({ error: "Error al obtener debug info" }, { status: 500 })
  }
}
