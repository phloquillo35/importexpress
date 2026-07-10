import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth"

export async function GET() {
  try {
    const session = await requireAuth()
    if (session instanceof Response) return session

    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        stock: true,
        minStock: true,
        priceUSD: true,
        isAvailable: true,
        category: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    })
    return Response.json(products)
  } catch (error) {
    console.error("Error fetching stock:", error)
    return Response.json({ error: "Error al cargar stock" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const { productId, quantity, operation, field } = await request.json()

    if (!productId || quantity === undefined) {
      return Response.json({ error: "productId y quantity son requeridos" }, { status: 400 })
    }

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    const qty = parseInt(quantity)
    if (isNaN(qty)) {
      return Response.json({ error: "quantity debe ser un número" }, { status: 400 })
    }

    const targetField = field || "stock"

    let newValue: number
    if (operation === "set") {
      newValue = Math.max(0, qty)
    } else {
      const current = targetField === "stock" ? product.stock : product.minStock
      newValue = Math.max(0, current + qty)
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { [targetField]: newValue },
      select: { id: true, name: true, stock: true, minStock: true },
    })

    return Response.json(updated)
  } catch (error) {
    console.error("Error adjusting stock:", error)
    return Response.json({ error: "Error al ajustar stock" }, { status: 500 })
  }
}
