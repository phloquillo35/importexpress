import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { genId, slugify } from "@/lib/utils"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const categoryId = searchParams.get("categoriaId")
    const categorySlug = searchParams.get("categoria")
    const featured = searchParams.get("destacados")
    const disponible = searchParams.get("disponible")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (disponible === "true") {
      where.isAvailable = true
    }

    if (search) {
      where.name = { contains: search }
    }

    if (categorySlug) {
      const category = await prisma.category.findUnique({ where: { slug: categorySlug } })
      if (category) where.categoryId = category.id
    } else if (categoryId) {
      where.categoryId = categoryId
    }

    if (featured === "true") {
      where.isFeatured = true
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          distributor: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    const parsed = products.map((p) => ({
      ...p,
      images: (p.images as string[]) || [],
    }))

    return Response.json({ products: parsed, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error("Error fetching products:", error)
    return Response.json({ error: "Error al cargar productos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      slug: providedSlug,
      description,
      specs,
      images,
      priceUSD,
      costUSD,
      stock,
      minStock,
      isAvailable,
      isFeatured,
      categoryId,
      distributorId,
    } = body

    if (!name || priceUSD === undefined) {
      return Response.json({ error: "name y priceUSD son requeridos" }, { status: 400 })
    }

    const slug = providedSlug || slugify(name)

    const existing = await prisma.product.findUnique({ where: { slug } })
    if (existing) {
      return Response.json({ error: "Ya existe un producto con ese slug" }, { status: 409 })
    }

    const product = await prisma.product.create({
      data: {
        id: genId(),
        name,
        slug,
        description: description || null,
        specs: specs || undefined,
        images: images || [],
        priceUSD: parseFloat(priceUSD),
        costUSD: costUSD ? parseFloat(costUSD) : null,
        stock: stock !== undefined ? parseInt(stock) : 0,
        minStock: minStock !== undefined ? parseInt(minStock) : 5,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
        isFeatured: isFeatured || false,
        categoryId: categoryId || null,
        distributorId: distributorId || null,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        distributor: { select: { id: true, name: true } },
      },
    })

    return Response.json(product, { status: 201 })
  } catch (error) {
    console.error("Error creating product:", error)
    return Response.json({ error: "Error al crear el producto" }, { status: 500 })
  }
}
