import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { requireRole } from "@/lib/auth"

const MODEL_MAP: Record<string, { findUnique: Function; update: Function; delete: Function }> = {
  productos: prisma.product,
  categorias: prisma.category,
  pedidos: prisma.order,
  bultos: prisma.bulk,
  transacciones: prisma.transaction,
  tiendas: prisma.store,
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ model: string; id: string }> }
) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const { model, id } = await params
    const db = MODEL_MAP[model]
    if (!db) {
      return Response.json({ error: `Modelo "${model}" no válido` }, { status: 400 })
    }

    const existing = await (db.findUnique as Function)({ where: { id } })
    if (!existing) {
      return Response.json({ error: "Elemento no encontrado" }, { status: 404 })
    }

    await (db.update as Function)({
      where: { id },
      data: { deletedAt: null },
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error("Error restoring item:", error)
    return Response.json({ error: "Error al restaurar elemento" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ model: string; id: string }> }
) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const { model, id } = await params
    const db = MODEL_MAP[model]
    if (!db) {
      return Response.json({ error: `Modelo "${model}" no válido` }, { status: 400 })
    }

    const existing = await (db.findUnique as Function)({ where: { id } })
    if (!existing) {
      return Response.json({ error: "Elemento no encontrado" }, { status: 404 })
    }

    await (db.delete as Function)({ where: { id } })

    return Response.json({ success: true })
  } catch (error) {
    console.error("Error permanently deleting item:", error)
    return Response.json({ error: "Error al eliminar permanentemente" }, { status: 500 })
  }
}
