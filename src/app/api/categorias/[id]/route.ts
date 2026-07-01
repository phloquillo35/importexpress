import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth"
import { updateCategorySchema } from "@/lib/validators"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    if (session instanceof Response) return session

    const { id } = await params
    const body = await request.json()
    const parsed = updateCategorySchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
    }

    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: "Categoría no encontrada" }, { status: 404 })
    }

    const data: Record<string, unknown> = {}

    if (body.name !== undefined) data.name = body.name
    if (body.slug !== undefined) {
      const slugExists = await prisma.category.findUnique({ where: { slug: body.slug } })
      if (slugExists && slugExists.id !== id) {
        return Response.json({ error: "Ya existe una categoría con ese slug" }, { status: 409 })
      }
      data.slug = body.slug
    }
    if (body.description !== undefined) data.description = body.description
    if (body.image !== undefined) data.image = body.image

    const category = await prisma.category.update({
      where: { id },
      data,
      include: { _count: { select: { products: true } } },
    })

    return Response.json(category)
  } catch (error) {
    console.error("Error updating category:", error)
    return Response.json({ error: "Error al actualizar la categoría" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    if (session instanceof Response) return session

    const { id } = await params

    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    })

    if (!existing) {
      return Response.json({ error: "Categoría no encontrada" }, { status: 404 })
    }

    if (existing._count.products > 0) {
      return Response.json(
        { error: `No se puede eliminar: tiene ${existing._count.products} producto(s) asociado(s)` },
        { status: 409 }
      )
    }

    await prisma.category.delete({ where: { id } })

    return Response.json({ success: true })
  } catch (error) {
    console.error("Error deleting category:", error)
    return Response.json({ error: "Error al eliminar la categoría" }, { status: 500 })
  }
}
