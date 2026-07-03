import { prisma } from "@/lib/prisma"
import { genId, slugify } from "@/lib/utils"
import { requireRole } from "@/lib/auth"
import { createCategorySchema } from "@/lib/validators"

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } }, children: { select: { id: true, name: true, slug: true } }, parent: { select: { id: true, name: true, slug: true } } },
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
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const body = await request.json()
    const parsed = createCategorySchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
    }

    const { name, slug: providedSlug, description, image, parentId, subcategories } = body

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
        parentId: parentId || null,
      },
      include: { _count: { select: { products: true } }, children: true, parent: true },
    })

    if (subcategories?.length) {
      const childData = subcategories.map((childName: string) => ({
        id: genId(),
        name: childName,
        slug: slugify(`${slug}-${childName}`),
        parentId: category.id,
      }))
      await prisma.category.createMany({ data: childData })
    }

    return Response.json(category, { status: 201 })
  } catch (error) {
    console.error("Error creating category:", error)
    return Response.json({ error: "Error al crear la categoría" }, { status: 500 })
  }
}
