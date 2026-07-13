import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { genId, slugify } from "@/lib/utils"
import { calculateFinalPrice } from "@/lib/pricing"
import { requireRole } from "@/lib/auth"
import { createProductSchema } from "@/lib/validators"

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
      const searchNumber = parseFloat(search.replace(/[$,.]/g, ""))
      const isNumeric = !isNaN(searchNumber)
      const lowerSearch = search.toLowerCase()

      const searchConditions: Record<string, unknown>[] = [
        { name: { contains: search, mode: "insensitive" } },
        { category: { name: { contains: search, mode: "insensitive" } } },
      ]

      if (lowerSearch === "disponible" || lowerSearch === "si" || lowerSearch === "sí") {
        searchConditions.push({ isAvailable: true })
      }
      if (lowerSearch === "no" || lowerSearch === "oculto") {
        searchConditions.push({ isAvailable: false })
      }

      if (isNumeric) {
        searchConditions.push(
          { costUSDT: { equals: searchNumber } },
          { shippingCost: { equals: searchNumber } },
          { finalPriceUSD: { equals: searchNumber } },
          { finalPriceARS: { equals: searchNumber } },
          { stock: { equals: searchNumber } },
        )
      }

      where.OR = searchConditions
    }

    if (categoriaId) {
      where.categoryId = categoriaId
    }

    if (categoria) {
      const cat = await prisma.category.findUnique({
        where: { slug: categoria },
        include: { children: { select: { id: true } } },
      })
      if (cat) {
        const categoryIds = [cat.id, ...cat.children.map(c => c.id)]
        where.categoryId = { in: categoryIds }
      }
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
        include: { category: { select: { name: true, slug: true, parent: { select: { name: true, slug: true } } } } },
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
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const body = await request.json()
    const parsed = createProductSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
    }

    const data = parsed.data

    if (!data.name) {
      return Response.json({ error: "name es requerido" }, { status: 400 })
    }

    const productSlug = data.slug || slugify(data.name)

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

    const costUSDT = data.costUSDT || 0
    const yoniEnabled = data.yoniEnabled
    const yoniType = data.yoniType || "percentage"
    const yoniValue = data.yoniValue ?? 25
    const shippingCost = data.shippingCost ?? 0
    const profitType = data.profitType || "percentage"
    const profitValue = data.profitValue ?? 0

    const pricing = calculateFinalPrice({
      costUSDT,
      yoniEnabled,
      yoniType: yoniType as "percentage" | "fixed_usdt" | "fixed_ars",
      yoniValue,
      shippingCost,
      profitType: profitType as "percentage" | "fixed_usdt" | "fixed_ars",
      profitValue,
      exchangeRate,
      usdtRate,
    })

    const product = await prisma.product.create({
      data: {
        id: genId(),
        name: data.name,
        slug: productSlug,
        description: data.description || null,
        specs: data.specs || null,
        images: data.images || undefined,
        priceUSD: pricing.finalPriceUSD,
        priceARS: pricing.finalPriceARS,
        costUSD: data.costUSD ?? null,
        costUSDT: costUSDT || null,
        yoniEnabled,
        yoniType,
        yoniValue,
        hasFinancing: data.hasFinancing ?? false,
        shippingCost,
        profitType,
        profitValue,
        finalPriceUSD: pricing.finalPriceUSD,
        finalPriceARS: pricing.finalPriceARS,
        stock: data.stock ?? 0,
        minStock: data.minStock ?? 5,
        isAvailable: data.isAvailable ?? true,
        isFeatured: data.isFeatured ?? false,
        categoryId: data.categoryId || null,
        storeId: data.storeId || null,
      },
      include: { category: { select: { name: true, slug: true, parent: { select: { name: true, slug: true } } } }, store: { select: { name: true } } },
    })

    return Response.json(product, { status: 201 })
  } catch (error) {
    console.error("Error creating product:", error)
    return Response.json({ error: "Error al crear producto" }, { status: 500 })
  }
}
