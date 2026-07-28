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
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.product.findMany({ where: { deletedAt: null }, select: { id: true, name: true, stock: true, minStock: true, slug: true } }),
      prisma.product.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 5, include: { category: { select: { name: true } } } }),
      prisma.transaction.findMany({ where: { deletedAt: null, date: { gte: since } }, orderBy: { date: "desc" } }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { items: true } }),
      prisma.category.findMany({ include: { _count: { select: { products: true } } } }),
      prisma.order.findMany({ where: { paymentStatus: { not: "pagado" } }, select: { totalUSD: true, amountPaidUSD: true } }),
    ])

    const incomeAgg = await prisma.transaction.aggregate({
      where: { deletedAt: null, type: "income", date: { gte: since } },
      _sum: { amountUSD: true },
    })

    const expenseAgg = await prisma.transaction.aggregate({
      where: { deletedAt: null, type: "expense", date: { gte: since } },
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

export default async function AdminDashboardPage(props: { searchParams: Promise<{ period?: string }> }) {
  const sp = await props.searchParams
  const periodDays = parseInt(sp.period || "30")
  const data = await getDashboardData(periodDays)
  return <DashboardClient data={data} period={periodDays} />
}
