import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function GET(_request: NextRequest) {
  try {
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
