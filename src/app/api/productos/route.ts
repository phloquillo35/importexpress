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

    const admin = searchParams.get("admin") || ""
    const where: Record<string, unknown> = {}

    if (!admin) {
      where.isAvailable = true
    }

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
    const { name, costUSDT, yoniEnabled, hasFinancing, shippingCost, profitType, profitValue } = body

    if (!name) {
      return Response.json({ error: "name es requerido" }, { status: 400 })
    }

    let productSlug = body.slug || slugify(name)

    const existing = await prisma.product.findUnique({ where: { slug: productSlug } })
    if (existing) {
      return Response.json({ error: "Ya existe un producto con ese slug" }, { status: 409 })
    }

    const [exchangeRateSetting, usdtRateSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "exchange_rate" } }),
      prisma.setting.findUnique({ where: { key: "usdt_rate" } }),
    ])
    const exchangeRate = parseFloat(exchangeRateSetting?.value || "1")
    const usdtRate = parseFloat(usdtRateSetting?.value || exchangeRateSetting?.value || "1")

    const usdt = parseFloat(costUSDT) || 0
    const yoni = yoniEnabled ?? false
    const ship = parseFloat(shippingCost) || 0
    const pType = profitType || "percentage"
    const pValue = parseFloat(profitValue) || 0

    const pricing = calculateFinalPrice({
      costUSDT: usdt,
      yoniEnabled: yoni,
      shippingCost: ship,
      profitType: pType as "percentage" | "fixed_usdt" | "fixed_ars",
      profitValue: pValue,
      exchangeRate,
      usdtRate,
    })

    const product = await prisma.product.create({
      data: {
        id: genId(),
        name,
        slug: productSlug,
        description: body.description || null,
        specs: body.specs || null,
        images: body.images || null,
        priceUSD: pricing.finalPriceUSD,
        priceARS: pricing.finalPriceARS,
        costUSD: body.costUSD ? parseFloat(body.costUSD) : null,
        costUSDT: usdt || null,
        yoniEnabled: yoni,
        hasFinancing: hasFinancing ?? false,
        shippingCost: ship,
        profitType: pType,
        profitValue: pValue,
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
