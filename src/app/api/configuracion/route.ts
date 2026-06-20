import { prisma } from "@/lib/prisma"

const DEFAULT_KEYS = ["exchange_rate", "business_name", "whatsapp", "instagram"] as const

export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: { key: { in: DEFAULT_KEYS as unknown as string[] } },
    })

    const result: Record<string, string> = {}
    for (const key of DEFAULT_KEYS) {
      const found = settings.find((s) => s.key === key)
      result[key] = found?.value || ""
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
