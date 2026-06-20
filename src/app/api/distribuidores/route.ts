import { prisma } from "@/lib/prisma"
import { genId } from "@/lib/utils"

export async function GET() {
  try {
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
    const body = await request.json()
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
