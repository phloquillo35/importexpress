import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        distributor: { select: { id: true, name: true, contact: true, website: true } },
      },
    })

    if (!product) {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    const related = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        isAvailable: true,
      },
      take: 4,
      include: { category: { select: { id: true, name: true, slug: true } } },
    })

    const parsed = {
      ...product,
      images: (product.images as string[]) || [],
    }

    return Response.json({ product: parsed, related })
  } catch (error) {
    console.error("Error fetching product:", error)
    return Response.json({ error: "Error al cargar el producto" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()

    const existing = await prisma.product.findUnique({ where: { slug } })
    if (!existing) {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    const data: Record<string, unknown> = {}

    if (body.name !== undefined) data.name = body.name
    if (body.slug !== undefined) {
      const slugExists = await prisma.product.findUnique({ where: { slug: body.slug } })
      if (slugExists && slugExists.id !== existing.id) {
        return Response.json({ error: "Ya existe un producto con ese slug" }, { status: 409 })
      }
      data.slug = body.slug
    }
    if (body.description !== undefined) data.description = body.description
    if (body.specs !== undefined) data.specs = body.specs
    if (body.images !== undefined) data.images = body.images
    if (body.priceUSD !== undefined) data.priceUSD = parseFloat(body.priceUSD)
    if (body.costUSD !== undefined) data.costUSD = body.costUSD ? parseFloat(body.costUSD) : null
    if (body.stock !== undefined) data.stock = parseInt(body.stock)
    if (body.minStock !== undefined) data.minStock = parseInt(body.minStock)
    if (body.isAvailable !== undefined) data.isAvailable = body.isAvailable
    if (body.isFeatured !== undefined) data.isFeatured = body.isFeatured
    if (body.categoryId !== undefined) data.categoryId = body.categoryId || null
    if (body.distributorId !== undefined) data.distributorId = body.distributorId || null

    const product = await prisma.product.update({
      where: { slug },
      data,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        distributor: { select: { id: true, name: true } },
      },
    })

    return Response.json({ ...product, images: (product.images as string[]) || [] })
  } catch (error) {
    console.error("Error updating product:", error)
    return Response.json({ error: "Error al actualizar el producto" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const existing = await prisma.product.findUnique({ where: { slug } })
    if (!existing) {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    await prisma.product.delete({ where: { slug } })

    return Response.json({ success: true })
  } catch (error) {
    console.error("Error deleting product:", error)
    return Response.json({ error: "Error al eliminar el producto" }, { status: 500 })
  }
}
