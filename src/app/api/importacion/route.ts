import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const bulks = await prisma.bulk.findMany({
      where,
      include: { distributor: { select: { id: true, name: true } } },
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
    const body = await request.json()
    const { date, distributorId, products, totalCostUSD, status, notes } = body

    if (!products || !products.length) {
      return Response.json({ error: "products es requerido" }, { status: 400 })
    }

    const bulk = await prisma.bulk.create({
      data: {
        id: (await import("@/lib/utils")).genId(),
        date: date ? new Date(date) : new Date(),
        distributorId: distributorId || null,
        products: products,
        totalCostUSD: parseFloat(totalCostUSD) || 0,
        status: status || "pending",
        notes: notes || null,
      },
      include: { distributor: { select: { id: true, name: true } } },
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
