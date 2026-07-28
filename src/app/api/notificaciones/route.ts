import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, stock: true, minStock: true, slug: true },
    })

    const lowStock = products
      .filter((p) => p.stock <= p.minStock)
      .map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        minStock: p.minStock,
        slug: p.slug,
      }))
      .sort((a, b) => a.stock / a.minStock - b.stock / b.minStock)

    return Response.json({
      count: lowStock.length,
      items: lowStock,
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return Response.json({ error: "Error al cargar notificaciones" }, { status: 500 })
  }
}
