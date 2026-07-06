import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { requireRole } from "@/lib/auth"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.admin.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: "Miembro no encontrado" }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.name) data.name = body.name
    if (body.email) data.email = body.email
    if (body.role) data.role = body.role

    const updated = await prisma.admin.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true },
    })

    return Response.json(updated)
  } catch (error) {
    console.error("Error updating admin:", error)
    return Response.json({ error: "Error al actualizar miembro" }, { status: 500 })
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

    if (id === session.user.id) {
      return Response.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 })
    }

    const existing = await prisma.admin.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: "Miembro no encontrado" }, { status: 404 })
    }

    await prisma.admin.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    console.error("Error deleting admin:", error)
    return Response.json({ error: "Error al eliminar miembro" }, { status: 500 })
  }
}