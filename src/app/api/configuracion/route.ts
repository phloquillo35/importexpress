import { prisma } from "@/lib/prisma"
import { hashSync } from "bcryptjs"
import { randomUUID } from "crypto"

const DEFAULT_KEYS = ["exchange_rate", "usdt_rate", "business_name", "whatsapp", "instagram"] as const
const DEFAULTS: Record<string, string> = {
  exchange_rate: "1350",
  usdt_rate: "1400",
  business_name: "Lo Pedís, Lo Tenes",
  whatsapp: "5491123456789",
  instagram: "@lopedis_lotenes.01",
}

export async function GET() {
  try {
    const adminExists = await prisma.admin.findUnique({ where: { email: "admin@importexpress.com" } })
    if (!adminExists) {
      await prisma.admin.create({
        data: {
          id: randomUUID(),
          email: "admin@importexpress.com",
          name: "Admin",
          password: hashSync("admin123", 10),
        },
      })
    }

    for (const key of DEFAULT_KEYS) {
      const exists = await prisma.setting.findUnique({ where: { key } })
      if (!exists && DEFAULTS[key]) {
        await prisma.setting.upsert({
          where: { key },
          update: { value: DEFAULTS[key] },
          create: { id: key, key, value: DEFAULTS[key] },
        })
      }
    }

    const settings = await prisma.setting.findMany({
      where: { key: { in: DEFAULT_KEYS as unknown as string[] } },
    })

    const result: Record<string, string> = {}
    for (const key of DEFAULT_KEYS) {
      const found = settings.find((s) => s.key === key)
      result[key] = found?.value || DEFAULTS[key] || ""
    }

    return Response.json(result)
  } catch (error) {
    console.error("Error fetching settings:", error)
    return Response.json({ error: "Error al cargar configuración" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()

    const updated: Record<string, string> = {}

    for (const key of DEFAULT_KEYS) {
      if (body[key] !== undefined) {
        await prisma.setting.upsert({
          where: { key },
          update: { value: String(body[key]) },
          create: { id: key, key, value: String(body[key]) },
        })
        updated[key] = String(body[key])
      }
    }

    return Response.json(updated)
  } catch (error) {
    console.error("Error updating settings:", error)
    return Response.json({ error: "Error al actualizar configuración" }, { status: 500 })
  }
}
