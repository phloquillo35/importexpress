import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { slugify } from "@/lib/utils"
import { calculateFinalPrice } from "@/lib/pricing"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const product = await prisma.product.findUnique({
      where: { slug },
      include: { category: { select: { name: true, slug: true } } },
    })

    if (!product) {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    const related = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        slug: { not: slug },
        isAvailable: true,
      },
      take: 4,
      orderBy: { createdAt: "desc" },
      select: {
        slug: true,
        name: true,
        priceUSD: true,
        priceARS: true,
        finalPriceUSD: true,
        finalPriceARS: true,
        images: true,
        stock: true,
        category: { select: { name: true, slug: true } },
      },
    })

    return Response.json({ product, related })
  } catch (error) {
    console.error("Error fetching product:", error)
    return Response.json({ error: "Error al cargar producto" }, { status: 500 })
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

    if (body.name) data.name = body.name
    if (body.slug) {
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
    if (body.priceARS !== undefined) data.priceARS = body.priceARS ? parseFloat(body.priceARS) : null
    if (body.costUSD !== undefined) data.costUSD = body.costUSD ? parseFloat(body.costUSD) : null
    if (body.costUSDT !== undefined) data.costUSDT = body.costUSDT ? parseFloat(body.costUSDT) : null
    if (body.yoniEnabled !== undefined) data.yoniEnabled = body.yoniEnabled
    if (body.shippingCost !== undefined) data.shippingCost = parseFloat(body.shippingCost)
    if (body.profitType !== undefined) data.profitType = body.profitType
    if (body.profitValue !== undefined) data.profitValue = parseFloat(body.profitValue)
    if (body.stock !== undefined) data.stock = parseInt(body.stock)
    if (body.minStock !== undefined) data.minStock = parseInt(body.minStock)
    if (body.isAvailable !== undefined) data.isAvailable = body.isAvailable
    if (body.isFeatured !== undefined) data.isFeatured = body.isFeatured
    if (body.categoryId !== undefined) data.categoryId = body.categoryId || null
    if (body.distributorId !== undefined) data.distributorId = body.distributorId || null

    const costUSDT = body.costUSDT ?? existing.costUSDT ?? existing.priceUSD
    const yoniEnabled = body.yoniEnabled ?? existing.yoniEnabled
    const shippingCost = body.shippingCost ?? existing.shippingCost
    const profitType = body.profitType ?? existing.profitType
    const profitValue = body.profitValue ?? existing.profitValue

    const settings = await prisma.setting.findUnique({ where: { key: "exchange_rate" } })
    const exchangeRate = parseFloat(settings?.value || "1")

    const pricing = calculateFinalPrice({
      costUSDT: Number(costUSDT) || 0,
      yoniEnabled: Boolean(yoniEnabled),
      shippingCost: Number(shippingCost) || 0,
      profitType: (profitType as "percentage" | "fixed_usdt") || "percentage",
      profitValue: Number(profitValue) || 0,
      exchangeRate,
    })

    data.finalPriceUSD = pricing.finalPriceUSD
    data.finalPriceARS = pricing.finalPriceARS

    const updated = await prisma.product.update({
      where: { slug },
      data,
      include: { category: { select: { name: true, slug: true } } },
    })

    return Response.json(updated)
  } catch (error) {
    console.error("Error updating product:", error)
    return Response.json({ error: "Error al actualizar producto" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
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
    return Response.json({ error: "Error al eliminar producto" }, { status: 500 })
  }
}
