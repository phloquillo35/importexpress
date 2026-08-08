import { compare, hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { z } from "zod"
import { rateLimit } from "@/lib/rate-limit"
import { requireAuth } from "@/lib/auth"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (session instanceof Response) return session

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const check = rateLimit(ip)
    if (!check.success) {
      return Response.json({ error: "Too many requests" }, { status: 429 })
    }

    const body = await request.json()
    const parsed = changePasswordSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
    }
    const { currentPassword, newPassword } = parsed.data

    const admin = await prisma.admin.findUnique({ where: { id: session.user.id } })
    if (!admin) {
      return Response.json({ error: "Administrador no encontrado" }, { status: 404 })
    }

    const isValid = await compare(currentPassword, admin.password)
    if (!isValid) {
      return Response.json({ error: "Contraseña actual incorrecta" }, { status: 400 })
    }

    const hashedPassword = await hash(newPassword, 12)

    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: hashedPassword },
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error("Change password error:", error)
    return Response.json({ error: "Error al cambiar la contraseña" }, { status: 500 })
  }
}
