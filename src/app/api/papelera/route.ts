import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"

export async function GET() {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const [products, categories, orders, bulks, transactions, stores] = await Promise.all([
      prisma.product.findMany({
        where: { deletedAt: { not: null } },
        select: { id: true, name: true, slug: true, deletedAt: true, finalPriceUSD: true },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.category.findMany({
        where: { deletedAt: { not: null } },
        select: { id: true, name: true, slug: true, deletedAt: true },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.order.findMany({
        where: { deletedAt: { not: null } },
        select: { id: true, internalNumber: true, clientName: true, clientSurname: true, totalUSD: true, deletedAt: true },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.bulk.findMany({
        where: { deletedAt: { not: null } },
        select: { id: true, internalNumber: true, type: true, courier: true, trackingCode: true, deletedAt: true },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.transaction.findMany({
        where: { deletedAt: { not: null } },
        select: { id: true, concept: true, type: true, amountUSD: true, deletedAt: true },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.store.findMany({
        where: { deletedAt: { not: null } },
        select: { id: true, name: true, deletedAt: true },
        orderBy: { deletedAt: "desc" },
      }),
    ])

    return Response.json({
      products,
      categorias: categories,
      pedidos: orders,
      bultos: bulks,
      transacciones: transactions,
      tiendas: stores,
    })
  } catch (error) {
    console.error("Error fetching papelera:", error)
    return Response.json({ error: "Error al cargar papelera" }, { status: 500 })
  }
}
