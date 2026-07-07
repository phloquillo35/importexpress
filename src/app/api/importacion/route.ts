import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { requireAuth, requireRole } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (session instanceof Response) return session

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const bulks = await prisma.bulk.findMany({
      where,
      include: { store: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
    })

    const parsed = bulks.map((b) => ({
      ...b,
      products: typeof b.products === "string" ? JSON.parse(b.products) : b.products,
    }))

    return Response.json(parsed)
  } catch (error) {
    console.error("Error fetching bulks:", error)
    return Response.json({ error: "Error al cargar bultos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const body = await request.json()
    const { date, storeId, products, totalCostUSD, status, notes } = body

    if (!products || !products.length) {
      return Response.json({ error: "products es requerido" }, { status: 400 })
    }

    const bulk = await prisma.bulk.create({
      data: {
        id: (await import("@/lib/utils")).genId(),
        date: date ? new Date(date) : new Date(),
        storeId: storeId || null,
        products: products,
        totalCostUSD: parseFloat(totalCostUSD) || 0,
        status: status || "pending",
        notes: notes || null,
      },
      include: { store: { select: { id: true, name: true } } },
    })

    return Response.json({
      ...bulk,
      products: typeof bulk.products === "string" ? JSON.parse(bulk.products) : bulk.products,
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating bulk:", error)
    return Response.json({ error: "Error al crear bulto" }, { status: 500 })
  }
}
