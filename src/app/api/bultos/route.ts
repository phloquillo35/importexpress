import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { genId } from "@/lib/utils"
import { requireAuth } from "@/lib/auth"
import { createBulkSchema } from "@/lib/validators"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (session instanceof Response) return session

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const courier = searchParams.get("courier")
    const type = searchParams.get("type")

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (courier) where.courier = courier
    if (type) where.type = type

    const bulks = await prisma.bulk.findMany({
      where,
      include: {
        distributor: { select: { id: true, name: true } },
        orderItems: {
          include: {
            order: { select: { id: true, clientName: true, clientSurname: true } },
            product: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: { date: "desc" },
    })

    const parsed = bulks.map((b) => ({
      ...b,
      products: typeof b.products === "string" ? JSON.parse(b.products) : b.products,
    }))

    return Response.json(parsed)
  } catch (error) {
    console.error("Error fetching bulks:", error)
    return Response.json({ error: "Error al cargar bultos" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth()
    if (session instanceof Response) return session

    const body = await request.json()
    const parsed = createBulkSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
    }

    const { type, courier, distributorId, orderItemIds, products, notes } = body

    if (!type || !courier) {
      return Response.json({ error: "type y courier son requeridos" }, { status: 400 })
    }

    const bulk = await prisma.bulk.create({
      data: {
        id: genId(),
        type,
        courier,
        distributorId: distributorId || null,
        products: products || [],
        notes: notes || null,
        orderItems: orderItemIds?.length
          ? { connect: orderItemIds.map((id: string) => ({ id })) }
          : undefined,
      },
      include: {
        orderItems: {
          include: {
            order: { select: { id: true, clientName: true } },
            product: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (orderItemIds?.length) {
      await prisma.orderItem.updateMany({
        where: { id: { in: orderItemIds } },
        data: { bulkId: bulk.id, bulkType: type },
      })
    }

    return Response.json({
      ...bulk,
      products: typeof bulk.products === "string" ? JSON.parse(bulk.products) : bulk.products,
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating bulk:", error)
    return Response.json({ error: "Error al crear bulto" }, { status: 500 })
  }
}
