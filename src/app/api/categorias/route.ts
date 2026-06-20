import { prisma } from "@/lib/prisma"
import { genId, slugify } from "@/lib/utils"

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    })
    return Response.json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error)
    return Response.json({ error: "Error al cargar categorías" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, slug: providedSlug, description, image } = body

    if (!name) {
      return Response.json({ error: "name es requerido" }, { status: 400 })
    }

    const slug = providedSlug || slugify(name)

    const existing = await prisma.category.findUnique({ where: { slug } })
    if (existing) {
      return Response.json({ error: "Ya existe una categoría con ese slug" }, { status: 409 })
    }

    const category = await prisma.category.create({
      data: {
        id: genId(),
        name,
        slug,
        description: description || null,
        image: image || null,
      },
      include: { _count: { select: { products: true } } },
    })

    return Response.json(category, { status: 201 })
  } catch (error) {
    console.error("Error creating category:", error)
    return Response.json({ error: "Error al crear la categoría" }, { status: 500 })
  }
}
