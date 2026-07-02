import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"
import { requireAuth } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const session = await requireAuth()
    if (session instanceof Response) return session

    const { email, password, name } = await request.json()

    if (!email || !password) {
      return Response.json({ error: "Email y contraseña son requeridos" }, { status: 400 })
    }

    const existing = await prisma.admin.findUnique({ where: { email } })
    if (existing) {
      return Response.json({ error: "Ya existe un administrador con ese email" }, { status: 400 })
    }

    const hashedPassword = await hash(password, 12)

    const admin = await prisma.admin.create({
      data: {
        id: randomUUID(),
        email,
        name: name || "Admin",
        password: hashedPassword,
      },
    })

    return Response.json({
      success: true,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    })
  } catch (error) {
    console.error("Invitar miembro error:", error)
    return Response.json({ error: "Error al crear el administrador" }, { status: 500 })
  }
}
