import { prisma } from "@/lib/prisma"
import { requireAuth, requireRole } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (session instanceof Response) return session

    const { searchParams } = new URL(request.url)
    const showDeleted = searchParams.get("showDeleted") === "true"
    const where: Record<string, unknown> = {}
    if (!showDeleted) where.deletedAt = null

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        stock: true,
        minStock: true,
        priceUSD: true,
        isAvailable: true,
        deletedAt: true,
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

    const qty = parseInt(quantity)
    if (isNaN(qty)) {
      return Response.json({ error: "quantity debe ser un número" }, { status: 400 })
    }

    const allowedFields = ["stock", "minStock"]
    const targetField = allowedFields.includes(field) ? field : "stock"

    // Lectura+escritura bajo lock de fila (igual que la creación de pedidos) para
    // que dos ajustes simultáneos no se pisen y se pierda uno de los dos.
    const updated = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string; stock: number; minStock: number }[]>`
        SELECT id, stock, "minStock" FROM "product" WHERE id = ${productId} FOR UPDATE
      `
      const locked = rows[0]
      if (!locked) throw new Error("NOT_FOUND")

      let newValue: number
      if (operation === "set") {
        newValue = Math.max(0, qty)
      } else {
        const current = targetField === "stock" ? locked.stock : locked.minStock
        newValue = Math.max(0, current + qty)
      }

      return tx.product.update({
        where: { id: productId },
        data: { [targetField]: newValue },
        select: { id: true, name: true, stock: true, minStock: true },
      })
    })

    return Response.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 })
    }
    console.error("Error adjusting stock:", error)
    return Response.json({ error: "Error al ajustar stock" }, { status: 500 })
  }
}
