import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const batch = await prisma.importBatch.findUnique({
      where: { id },
      include: { distributor: { select: { id: true, name: true } } },
    })
    if (!batch) return Response.json({ error: "Lote no encontrado" }, { status: 404 })
    return Response.json({
      ...batch,
      products: typeof batch.products === "string" ? JSON.parse(batch.products) : batch.products,
    })
  } catch (error) {
    console.error("Error fetching batch:", error)
    return Response.json({ error: "Error al cargar lote" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.importBatch.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: "Lote no encontrado" }, { status: 404 })

    const data: Record<string, unknown> = {}

    if (body.status) data.status = body.status
    if (body.notes !== undefined) data.notes = body.notes
    if (body.totalCostUSD !== undefined) data.totalCostUSD = parseFloat(body.totalCostUSD)
    if (body.products) data.products = body.products

    if (body.status === "received" || body.status === "arrived") {
      const currentProducts = typeof existing.products === "string"
        ? JSON.parse(existing.products)
        : existing.products
      if (Array.isArray(currentProducts)) {
        for (const item of currentProducts) {
          if (item.productId && item.quantity) {
            await prisma.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            })
          }
        }
      }
    }

    const updated = await prisma.importBatch.update({
      where: { id },
      data,
      include: { distributor: { select: { id: true, name: true } } },
    })

    return Response.json({
      ...updated,
      products: typeof updated.products === "string" ? JSON.parse(updated.products) : updated.products,
    })
  } catch (error) {
    console.error("Error updating batch:", error)
    return Response.json({ error: "Error al actualizar lote" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await prisma.importBatch.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: "Lote no encontrado" }, { status: 404 })
    await prisma.importBatch.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    console.error("Error deleting batch:", error)
    return Response.json({ error: "Error al eliminar lote" }, { status: 500 })
  }
}
