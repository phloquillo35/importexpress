import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { genId } from "@/lib/utils"
import { requireRole } from "@/lib/auth"

export async function GET() {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const banners = await prisma.heroBanner.findMany({
      orderBy: [{ type: "asc" }, { order: "asc" }],
    })

    const carousel = banners.filter((b) => b.type === "carousel")
    const flyers = banners.filter((b) => b.type === "flyer")

    return Response.json({ carousel, flyers })
  } catch (error) {
    console.error("Error fetching hero banners:", error)
    return Response.json({ error: "Error al cargar banners" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const body = await request.json()
    const { type, position, image, link } = body

    if (!image) {
      return Response.json({ error: "La imagen es requerida" }, { status: 400 })
    }

    let order = 0
    if (type === "carousel") {
      const last = await prisma.heroBanner.findFirst({
        where: { type: "carousel" },
        orderBy: { order: "desc" },
        select: { order: true },
      })
      order = (last?.order ?? -1) + 1
    }

    const banner = await prisma.heroBanner.create({
      data: {
        id: genId(),
        type: type || "carousel",
        position: position || "carousel",
        image,
        link: link || null,
        order,
        isActive: true,
      },
    })

    return Response.json(banner, { status: 201 })
  } catch (error) {
    console.error("Error creating hero banner:", error)
    return Response.json({ error: "Error al crear banner" }, { status: 500 })
  }
}
