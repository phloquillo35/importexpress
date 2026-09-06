import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { publicRateLimiter } from "@/lib/rate-limit"

export async function GET(_request: NextRequest) {
  try {
    if (!publicRateLimiter.check(_request)) {
      return Response.json({ error: "Demasiadas solicitudes. Intentá de nuevo en un minuto." }, { status: 429 })
    }

    const banners = await prisma.heroBanner.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    })

    const carousel = banners.filter((b) => b.type === "carousel")
    const flyers = banners.filter((b) => b.type === "flyer")

    return Response.json({ carousel, flyers })
  } catch (error) {
    console.error("Error fetching hero banners:", error)
    return Response.json({ error: "Error al cargar hero" }, { status: 500 })
  }
}
