import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { requireRole } from "@/lib/auth"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.transaction.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: "Transacción no encontrada" }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (body.type) data.type = body.type
    if (body.concept) data.concept = body.concept
    if (body.amountUSD !== undefined) data.amountUSD = parseFloat(body.amountUSD)
    if (body.amountARS !== undefined) data.amountARS = body.amountARS ? parseFloat(body.amountARS) : null
    if (body.date) data.date = new Date(body.date)
    if (body.notes !== undefined) data.notes = body.notes

    const updated = await prisma.transaction.update({ where: { id }, data })
    return Response.json(updated)
  } catch (error) {
    console.error("Error updating transaction:", error)
    return Response.json({ error: "Error al actualizar transacción" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const { id } = await params
    const existing = await prisma.transaction.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: "Transacción no encontrada" }, { status: 404 })
    await prisma.transaction.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return Response.json({ error: "Error al eliminar transacción" }, { status: 500 })
  }
}
