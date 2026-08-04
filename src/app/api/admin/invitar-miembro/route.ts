import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { sendEmail } from "@/lib/email"

const inviteSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "customer"]).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const body = await request.json()
    const parsed = inviteSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
    }
    const { email, password, name, role } = parsed.data

    const existing = await prisma.admin.findUnique({ where: { email } })
    if (existing) {
      return Response.json({ error: "Ya existe un administrador con ese email" }, { status: 400 })
    }

    const hashedPassword = await hash(password, 12)
    const memberRole = role || "customer"

    const admin = await prisma.admin.create({
      data: {
        id: randomUUID(),
        email,
        name: name || "Nuevo Miembro",
        password: hashedPassword,
        role: memberRole,
      },
    })

    await sendEmail({
      to: email,
      subject: "Tus credenciales de acceso — ImportExpress",
      html: `
        <h2>Bienvenido a ImportExpress</h2>
        <p>Has sido registrado en el sistema de ImportExpress.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Contraseña:</strong> ${password}</p>
        <p>Podés iniciar sesión en: <a href="${process.env.NEXT_PUBLIC_URL || "https://lopedis-lotenes.up.railway.app"}/login">${process.env.NEXT_PUBLIC_URL || "https://lopedis-lotenes.up.railway.app"}/login</a></p>
        <p>Saludos,<br/>Equipo ImportExpress</p>
      `,
    }).catch(() => console.warn("[invitar-miembro] SMTP no configurado — miembro creado sin email"))

    return Response.json({
      success: true,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    })
  } catch (error) {
    console.error("Invitar miembro error:", error)
    return Response.json({ error: "Error al crear el administrador" }, { status: 500 })
  }
}
