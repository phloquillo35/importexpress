import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"
import { NextRequest } from "next/server"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("x-register-secret")
    if (!secret || secret !== process.env.REGISTER_SECRET) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const check = rateLimit(ip)
    if (!check.success) {
      return Response.json({ error: "Too many requests" }, { status: 429 })
    }

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
