import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { requireRole } from "@/lib/auth"
import { updateStoreSchema } from "@/lib/validators"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const { id } = await params
    const body = await request.json()

    const parsed = updateStoreSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
    }

    const existing = await prisma.store.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: "Tienda no encontrada" }, { status: 404 })

    const updated = await prisma.store.update({ where: { id }, data: parsed.data })
    return Response.json(updated)
  } catch (error) {
    console.error("Error updating store:", error)
    return Response.json({ error: "Error al actualizar tienda" }, { status: 500 })
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
    const existing = await prisma.store.findUnique({
      where: { id },
      include: { _count: { select: { products: true, bulks: true } } },
    })
    if (!existing) return Response.json({ error: "Tienda no encontrada" }, { status: 404 })
    if (existing._count.products > 0 || existing._count.bulks > 0) {
      return Response.json({
        error: `No se puede eliminar: tiene ${existing._count.products} producto(s) y ${existing._count.bulks} bulto(s) asociados`,
      }, { status: 409 })
    }
    await prisma.store.update({ where: { id }, data: { deletedAt: new Date() } })
    return Response.json({ success: true })
  } catch (error) {
    console.error("Error deleting store:", error)
    return Response.json({ error: "Error al eliminar tienda" }, { status: 500 })
  }
}
