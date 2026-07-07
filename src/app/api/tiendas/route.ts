import { prisma } from "@/lib/prisma"
import { genId } from "@/lib/utils"
import { requireAuth, requireRole } from "@/lib/auth"
import { createStoreSchema } from "@/lib/validators"

export async function GET() {
  try {
    const session = await requireAuth()
    if (session instanceof Response) return session

    const stores = await prisma.store.findMany({
      orderBy: { name: "asc" },
    })
    return Response.json(stores)
  } catch (error) {
    console.error("Error fetching stores:", error)
    return Response.json({ error: "Error al cargar tiendas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const body = await request.json()
    const parsed = createStoreSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
    }

    const { name, contact, website, notes } = body

    if (!name) {
      return Response.json({ error: "name es requerido" }, { status: 400 })
    }

    const store = await prisma.store.create({
      data: {
        id: genId(),
        name,
        contact: contact || null,
        website: website || null,
        notes: notes || null,
      },
    })

    return Response.json(store, { status: 201 })
  } catch (error) {
    console.error("Error creating store:", error)
    return Response.json({ error: "Error al crear tienda" }, { status: 500 })
  }
}
