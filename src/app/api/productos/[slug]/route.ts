import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { slugify } from "@/lib/utils"
import { calculateFinalPrice } from "@/lib/pricing"
import { requireRole } from "@/lib/auth"
import { updateProductSchema } from "@/lib/validators"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const product = await prisma.product.findUnique({
      where: { slug },
      include: { category: { select: { name: true, slug: true, parent: { select: { name: true, slug: true } } } } },
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
        hasFinancing: true,
        category: { select: { name: true, slug: true, parent: { select: { name: true, slug: true } } } },
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
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const { slug } = await params
    const body = await request.json()
    const parsed = updateProductSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
    }

    const existing = await prisma.product.findUnique({ where: { slug } })
    if (!existing) {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    const input = parsed.data
    const data: Record<string, unknown> = {}

    if (input.name) data.name = input.name
    if (input.slug) {
      const slugExists = await prisma.product.findUnique({ where: { slug: input.slug } })
      if (slugExists && slugExists.id !== existing.id) {
        return Response.json({ error: "Ya existe un producto con ese slug" }, { status: 409 })
      }
      data.slug = input.slug
    }
    if (input.description !== undefined) data.description = input.description
    if (input.specs !== undefined) data.specs = input.specs
    if (input.images !== undefined) data.images = input.images
    if (input.priceUSD !== undefined) data.priceUSD = input.priceUSD
    if (input.priceARS !== undefined) data.priceARS = input.priceARS
    if (input.costUSD !== undefined) data.costUSD = input.costUSD
    if (input.costUSDT !== undefined) data.costUSDT = input.costUSDT
    if (input.yoniEnabled !== undefined) data.yoniEnabled = input.yoniEnabled
    if (input.yoniType !== undefined) data.yoniType = input.yoniType
    if (input.yoniValue !== undefined) data.yoniValue = input.yoniValue
    if (input.shippingCost !== undefined) data.shippingCost = input.shippingCost
    if (input.profitType !== undefined) data.profitType = input.profitType
    if (input.profitValue !== undefined) data.profitValue = input.profitValue
    if (input.stock !== undefined) data.stock = input.stock
    if (input.minStock !== undefined) data.minStock = input.minStock
    if (input.isAvailable !== undefined) data.isAvailable = input.isAvailable
    if (input.isFeatured !== undefined) data.isFeatured = input.isFeatured
    if (input.hasFinancing !== undefined) data.hasFinancing = input.hasFinancing
    if (input.categoryId !== undefined) data.categoryId = input.categoryId || null
    if (input.storeId !== undefined) data.storeId = input.storeId || null

    const costUSDT = input.costUSDT ?? existing.costUSDT ?? existing.priceUSD
    const yoniEnabled = input.yoniEnabled ?? existing.yoniEnabled
    const yoniType = (input.yoniType ?? existing.yoniType ?? "percentage") as "percentage" | "fixed_usdt" | "fixed_ars"
    const yoniValue = input.yoniValue ?? existing.yoniValue ?? 25
    const shippingCost = input.shippingCost ?? existing.shippingCost
    const profitType = (input.profitType ?? existing.profitType) as "percentage" | "fixed_usdt" | "fixed_ars"
    const profitValue = input.profitValue ?? existing.profitValue

    const [exchangeRateSetting, usdtRateSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "exchange_rate" } }),
      prisma.setting.findUnique({ where: { key: "usdt_rate" } }),
    ])
    const exchangeRate = parseFloat(exchangeRateSetting?.value || "1")
    const usdtRate = parseFloat(usdtRateSetting?.value || exchangeRateSetting?.value || "1")

    const pricing = calculateFinalPrice({
      costUSDT: Number(costUSDT) || 0,
      yoniEnabled: Boolean(yoniEnabled),
      yoniType,
      yoniValue: Number(yoniValue) || 0,
      shippingCost: Number(shippingCost) || 0,
      profitType: profitType || "percentage",
      profitValue: Number(profitValue) || 0,
      exchangeRate,
      usdtRate,
    })

    data.finalPriceUSD = pricing.finalPriceUSD
    data.finalPriceARS = pricing.finalPriceARS
    data.priceUSD = pricing.finalPriceUSD
    data.priceARS = pricing.finalPriceARS

    const updated = await prisma.product.update({
      where: { slug },
      data,
      include: { category: { select: { name: true, slug: true, parent: { select: { name: true, slug: true } } } } },
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
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const { slug } = await params
    const existing = await prisma.product.findUnique({ where: { slug } })
    if (!existing) {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    await prisma.product.update({ where: { slug }, data: { deletedAt: new Date() } })
    return Response.json({ success: true })
  } catch (error) {
    console.error("Error deleting product:", error)
    return Response.json({ error: "Error al eliminar producto" }, { status: 500 })
  }
}
