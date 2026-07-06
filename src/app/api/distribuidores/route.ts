import { prisma } from "@/lib/prisma"
import { genId } from "@/lib/utils"
import { requireAuth, requireRole } from "@/lib/auth"
import { createDistributorSchema } from "@/lib/validators"

export async function GET() {
  try {
    const session = await requireAuth()
    if (session instanceof Response) return session

    const distributors = await prisma.distributor.findMany({
      orderBy: { name: "asc" },
    })
    return Response.json(distributors)
  } catch (error) {
    console.error("Error fetching distributors:", error)
    return Response.json({ error: "Error al cargar distribuidores" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const body = await request.json()
    const parsed = createDistributorSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
    }

    const { name, contact, website, notes } = body

    if (!name) {
      return Response.json({ error: "name es requerido" }, { status: 400 })
    }

    const distributor = await prisma.distributor.create({
      data: {
        id: genId(),
        name,
        contact: contact || null,
        website: website || null,
        notes: notes || null,
      },
    })

    return Response.json(distributor, { status: 201 })
  } catch (error) {
    console.error("Error creating distributor:", error)
    return Response.json({ error: "Error al crear distribuidor" }, { status: 500 })
  }
}
