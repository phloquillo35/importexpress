import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { genId } from "@/lib/utils"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const batches = await prisma.importBatch.findMany({
      where,
      include: { distributor: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
    })

    const parsed = batches.map((b) => ({
      ...b,
      products: typeof b.products === "string" ? JSON.parse(b.products) : b.products,
    }))

    return Response.json(parsed)
  } catch (error) {
    console.error("Error fetching import batches:", error)
    return Response.json({ error: "Error al cargar lotes" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { date, distributorId, products, totalCostUSD, status, notes } = body

    if (!products || !products.length) {
      return Response.json({ error: "products es requerido" }, { status: 400 })
    }

    const batch = await prisma.importBatch.create({
      data: {
        id: genId(),
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
      ...batch,
      products: typeof batch.products === "string" ? JSON.parse(batch.products) : batch.products,
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating import batch:", error)
    return Response.json({ error: "Error al crear lote" }, { status: 500 })
  }
}
