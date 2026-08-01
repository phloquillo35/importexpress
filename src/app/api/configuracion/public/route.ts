import { prisma } from "@/lib/prisma"

// Keys públicas no sensibles: solo lo que el frontend público necesita.
// NUNCA incluir smtp_* ni credenciales aquí.
const PUBLIC_KEYS = ["exchange_rate", "usdt_rate", "business_name", "whatsapp", "instagram"] as const
const DEFAULTS: Record<string, string> = {
  exchange_rate: "1350",
  usdt_rate: "1400",
  business_name: "Lo Pedís, Lo Tenes",
  whatsapp: "5491123456789",
  instagram: "@lopedis_lotenes.01",
}

export async function GET() {
  try {
    for (const key of PUBLIC_KEYS) {
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
      where: { key: { in: PUBLIC_KEYS as unknown as string[] } },
    })

    const result: Record<string, string> = {}
    for (const key of PUBLIC_KEYS) {
      const found = settings.find((s) => s.key === key)
      result[key] = found?.value || DEFAULTS[key] || ""
    }

    return Response.json(result)
  } catch (error) {
    console.error("Error fetching public settings:", error)
    return Response.json({ error: "Error al cargar configuración" }, { status: 500 })
  }
}
