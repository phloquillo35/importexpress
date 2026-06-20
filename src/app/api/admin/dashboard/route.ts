import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const totalProducts = await prisma.product.count()
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    const lowStockProducts = products.filter((p: { stock: number; minStock: number }) => p.stock <= p.minStock).length

    const recentTransactions = await prisma.transaction.findMany({
      orderBy: { date: "desc" },
      take: 10,
    })

    return Response.json({
      totalProducts,
      lowStockProducts,
      products,
      recentTransactions,
    })
  } catch (error) {
    console.error("Dashboard error:", error)
    return Response.json({ error: "Error loading dashboard" }, { status: 500 })
  }
}
