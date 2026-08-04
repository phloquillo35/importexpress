import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { requireRole } from "@/lib/auth"
import { revalidateTag } from "next/cache"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const { id } = await params
    const body = await request.json()
    const { image, link, position, isActive, order } = body

    const existing = await prisma.heroBanner.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: "Banner no encontrado" }, { status: 404 })
    }

    const banner = await prisma.heroBanner.update({
      where: { id },
      data: {
        ...(image !== undefined && { image }),
        ...(link !== undefined && { link }),
        ...(position !== undefined && { position }),
        ...(isActive !== undefined && { isActive }),
        ...(order !== undefined && { order }),
      },
    })

    revalidateTag("hero", "max")

    return Response.json(banner)
  } catch (error) {
    console.error("Error updating hero banner:", error)
    return Response.json({ error: "Error al actualizar banner" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const { id } = await params

    const existing = await prisma.heroBanner.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: "Banner no encontrado" }, { status: 404 })
    }

    await prisma.heroBanner.delete({ where: { id } })

    revalidateTag("hero", "max")

    return Response.json({ success: true })
  } catch (error) {
    console.error("Error deleting hero banner:", error)
    return Response.json({ error: "Error al eliminar banner" }, { status: 500 })
  }
}
