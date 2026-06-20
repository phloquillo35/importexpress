import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    const existingAdmin = await prisma.admin.findUnique({ where: { email } })
    if (existingAdmin) {
      return Response.json({ error: "El email ya está registrado" }, { status: 400 })
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

    const existingRate = await prisma.setting.findUnique({ where: { key: "exchange_rate" } })
    if (!existingRate) {
      await prisma.setting.create({ data: { id: randomUUID(), key: "exchange_rate", value: "1200" } })
    }

    return Response.json({
      success: true,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    })
  } catch (error) {
    console.error("Register error:", error)
    return Response.json({ error: "Error al crear el administrador" }, { status: 500 })
  }
}
