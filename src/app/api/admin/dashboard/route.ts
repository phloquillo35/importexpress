import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const totalProducts = await prisma.product.count()

    // Productos para mostrar en dashboard (últimos 20)
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    // Low stock: contar sobre TODOS los productos, no solo los primeros 20
    const allProducts = await prisma.product.findMany({
      select: { stock: true, minStock: true },
      where: { deletedAt: null },
    })
    const lowStockProducts = allProducts.filter(
      (p: { stock: number; minStock: number }) => p.stock <= p.minStock
    ).length

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
