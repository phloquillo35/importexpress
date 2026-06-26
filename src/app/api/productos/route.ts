import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { genId, slugify } from "@/lib/utils"
import { calculateFinalPrice } from "@/lib/pricing"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const categoriaId = searchParams.get("categoriaId") || ""
    const categoria = searchParams.get("categoria") || ""
    const destacados = searchParams.get("destacados") || ""
    const disponible = searchParams.get("disponible") || ""
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")))

    const where: Record<string, unknown> = {}

    if (search) {
      where.name = { contains: search }
    }

    if (categoriaId) {
      where.categoryId = categoriaId
    }

    if (categoria) {
      const cat = await prisma.category.findUnique({ where: { slug: categoria } })
      if (cat) where.categoryId = cat.id
    }

    if (destacados === "true") {
      where.isFeatured = true
    }

    if (disponible === "true") {
      where.isAvailable = true
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: { select: { name: true, slug: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ])

    return Response.json({ products, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error("Error fetching products:", error)
    return Response.json({ error: "Error al cargar productos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, priceUSD, costUSDT, yoniEnabled, shippingCost, profitType, profitValue, exchangeRate } = body

    if (!name || !priceUSD) {
      return Response.json({ error: "name y priceUSD son requeridos" }, { status: 400 })
    }

    let productSlug = body.slug || slugify(name)

    const existing = await prisma.product.findUnique({ where: { slug: productSlug } })
    if (existing) {
      return Response.json({ error: "Ya existe un producto con ese slug" }, { status: 409 })
    }

    const pricing = calculateFinalPrice({
      costUSDT: parseFloat(costUSDT || priceUSD) || 0,
      yoniEnabled: yoniEnabled ?? false,
      shippingCost: parseFloat(shippingCost) || 0,
      profitType: profitType || "percentage",
      profitValue: parseFloat(profitValue) || 0,
      exchangeRate: parseFloat(exchangeRate) || 1,
    })

    const product = await prisma.product.create({
      data: {
        id: genId(),
        name,
        slug: productSlug,
        description: body.description || null,
        specs: body.specs || null,
        images: body.images || null,
        priceUSD: parseFloat(priceUSD),
        priceARS: body.priceARS ? parseFloat(body.priceARS) : null,
        costUSD: body.costUSD ? parseFloat(body.costUSD) : null,
        costUSDT: parseFloat(costUSDT) || null,
        yoniEnabled: yoniEnabled ?? false,
        shippingCost: parseFloat(shippingCost) || 0,
        profitType: profitType || "percentage",
        profitValue: parseFloat(profitValue) || 0,
        finalPriceUSD: pricing.finalPriceUSD,
        finalPriceARS: pricing.finalPriceARS,
        stock: parseInt(body.stock) || 0,
        minStock: parseInt(body.minStock) || 5,
        isAvailable: body.isAvailable ?? true,
        isFeatured: body.isFeatured ?? false,
        categoryId: body.categoryId || null,
        distributorId: body.distributorId || null,
      },
      include: { category: { select: { name: true, slug: true } }, distributor: { select: { name: true } } },
    })

    return Response.json(product, { status: 201 })
  } catch (error) {
    console.error("Error creating product:", error)
    return Response.json({ error: "Error al crear producto" }, { status: 500 })
  }
}
