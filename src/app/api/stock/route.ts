import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
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
    const { productId, quantity, operation } = await request.json()

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

    let newStock: number
    if (operation === "set") {
      newStock = Math.max(0, qty)
    } else {
      newStock = Math.max(0, product.stock + qty)
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { stock: newStock },
      select: { id: true, name: true, stock: true, minStock: true },
    })

    return Response.json(updated)
  } catch (error) {
    console.error("Error adjusting stock:", error)
    return Response.json({ error: "Error al ajustar stock" }, { status: 500 })
  }
}
