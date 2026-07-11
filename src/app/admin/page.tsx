import { prisma } from "@/lib/prisma"
import { DashboardClient } from "@/components/admin/DashboardClient"

async function getDashboardData(periodDays: number = 30) {
  try {
    const since = new Date()
    since.setDate(since.getDate() - periodDays)

    const [
      totalProducts,
      allProducts,
      recentProducts,
      recentTransactions,
      recentOrders,
      categories,
      pendingOrders,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.findMany({ select: { id: true, name: true, stock: true, minStock: true, slug: true } }),
      prisma.product.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { category: { select: { name: true } } } }),
      prisma.transaction.findMany({ where: { date: { gte: since } }, orderBy: { date: "desc" } }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { items: true } }),
      prisma.category.findMany({ include: { _count: { select: { products: true } } } }),
      prisma.order.findMany({ where: { paymentStatus: { not: "paid" } }, select: { totalUSD: true, amountPaidUSD: true } }),
    ])

    const incomeAgg = await prisma.transaction.aggregate({
      where: { type: "income", date: { gte: since } },
      _sum: { amountUSD: true },
    })

    const expenseAgg = await prisma.transaction.aggregate({
      where: { type: "expense", date: { gte: since } },
      _sum: { amountUSD: true },
    })

    const lowStockProducts = allProducts.filter((p) => p.stock <= p.minStock)

    const pendingPaymentsCount = pendingOrders.length
    const totalPendingUSD = pendingOrders.reduce((sum, o) => sum + Math.max(0, o.totalUSD - o.amountPaidUSD), 0)

    return {
      totalProducts,
      lowStockProducts,
      recentProducts,
      transactions: recentTransactions,
      orders: recentOrders,
      incomeUSD: incomeAgg._sum.amountUSD ?? 0,
      expenseUSD: expenseAgg._sum.amountUSD ?? 0,
      recentTransactions,
      categories: categories.map((c) => ({
        name: c.name,
        count: c._count.products,
      })),
      pendingPaymentsCount,
      totalPendingUSD,
    }
  } catch {
    return {
      totalProducts: 0,
      lowStockProducts: [],
      recentProducts: [],
      transactions: [],
      orders: [],
      incomeUSD: 0,
      expenseUSD: 0,
      recentTransactions: [],
      categories: [],
      pendingPaymentsCount: 0,
      totalPendingUSD: 0,
    }
  }
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData(30)
  return <DashboardClient data={data} />
}
