import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await requireAuth()
    if (session instanceof Response) return session

    const admins = await prisma.admin.findMany({
      select: { id: true, email: true, name: true },
      orderBy: { createdAt: "asc" },
    })

    return Response.json({ admins })
  } catch (error) {
    console.error("Error fetching admins:", error)
    return Response.json({ error: "Error al cargar administradores" }, { status: 500 })
  }
}
