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
    const rawPage = parseInt(searchParams.get("page") || "1", 10)
    const page = Number.isNaN(rawPage) ? 1 : Math.max(1, rawPage)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const rawOffset = parseInt(searchParams.get("offset") || "0", 10)
    const offset = Number.isNaN(rawOffset) ? 0 : Math.max(0, rawOffset)

    const admin = searchParams.get("admin") || ""
    const showDeleted = searchParams.get("showDeleted") === "true"

    if (admin || showDeleted) {
      const session = await requireRole("admin")
      if (session instanceof Response) return session
    }
    const where: Record<string, unknown> = {}
    if (!showDeleted) where.deletedAt = null

    if (search) {
      // Soporte para formato argentino y decimal estándar
      let cleanNumber = search.replace(/[$]/g, "").trim()

      if (cleanNumber.includes(",")) {
        // Formato argentino con coma decimal: "32.000,50" → sacar puntos → "32000,50" → coma a punto → "32000.50"
        cleanNumber = cleanNumber.replace(/\./g, "").replace(",", ".")
      } else {
        // Sin coma: detectar si el punto es decimal o de miles
        const dotCount = (cleanNumber.match(/\./g) || []).length

        if (dotCount >= 2) {
          // Múltiples puntos: seguro es separador de miles: "1.000.000" → "1000000"
          cleanNumber = cleanNumber.replace(/\./g, "")
        } else if (dotCount === 1) {
          // Un solo punto: puede ser decimal (721.25) o de miles (32.000)
          const afterDot = cleanNumber.split(".")[1] || ""
          if (afterDot.length === 3) {
            // "32.000" → 3 dígitos después del punto = separador de miles argentino
            cleanNumber = cleanNumber.replace(/\./g, "")
          }
          // Si tiene 1-2 dígitos → es decimal: "721.25", "90.5" → mantener punto
        }
        // Si no tiene puntos (dotCount === 0) → usar tal cual
      }
      const searchNumber = parseFloat(cleanNumber)
      const isNumeric = !isNaN(searchNumber)
      const lowerSearch = search.toLowerCase()

      const searchConditions: Record<string, unknown>[] = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
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
          // Precios: rango ±1 para cubrir redondeos
          { costUSDT: { gte: searchNumber - 1, lte: searchNumber + 1 } },
          { costUSD: { gte: searchNumber - 1, lte: searchNumber + 1 } },
          { priceUSD: { gte: searchNumber - 1, lte: searchNumber + 1 } },
          { priceARS: { gte: searchNumber - 1, lte: searchNumber + 1 } },
          { finalPriceUSD: { gte: searchNumber - 1, lte: searchNumber + 1 } },
          { finalPriceARS: { gte: searchNumber - 1, lte: searchNumber + 1 } },
          { subtotalARS: { gte: searchNumber - 1, lte: searchNumber + 1 } },
          { profitARS: { gte: searchNumber - 1, lte: searchNumber + 1 } },
          { shippingCost: { gte: searchNumber - 1, lte: searchNumber + 1 } },
        )
        // Stock: búsqueda exacta solo si el número es entero (stock es Int en Prisma)
        if (Number.isInteger(searchNumber)) {
          searchConditions.push({ stock: { equals: searchNumber } })
        }
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
    } else if (disponible === "false") {
      where.isAvailable = false
    }

    const total = await prisma.product.count({ where })
    const totalPages = Math.ceil(total / limit)
    const safePage = Math.min(page, Math.max(1, totalPages))

    // Use offset if provided, otherwise calculate from page
    const skip = offset > 0 ? offset : (safePage - 1) * limit

    const [products, totalAll] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: { select: { name: true, slug: true, parent: { select: { name: true, slug: true } } } } },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where: { deletedAt: null, ...(!admin ? { isAvailable: true } : {}) } }),
    ])

    return Response.json({ products, total, totalAll, page: safePage, totalPages })
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
        subtotalARS: pricing.subtotalARS,
        profitARS: pricing.profitARS,
        stock: data.stock ?? 0,
        minStock: data.minStock ?? 5,
        isAvailable: data.isAvailable ?? true,
        isFeatured: data.isFeatured ?? false,
        freeShipping: data.freeShipping ?? false,
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
