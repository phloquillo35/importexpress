import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { genId } from "@/lib/utils"
import { requireAuth, requireRole } from "@/lib/auth"
import { createTransactionSchema } from "@/lib/validators"
import { recalculatePaymentStatus } from "@/lib/orders"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (session instanceof Response) return session

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get("tipo")
    const desde = searchParams.get("desde")
    const hasta = searchParams.get("hasta")
    const showDeleted = searchParams.get("showDeleted") === "true"

    const where: Record<string, unknown> = {}

    if (tipo) where.type = tipo
    if (!showDeleted) where.deletedAt = null
    if (desde || hasta) {
      const dateFilter: Record<string, string> = {}
      if (desde) dateFilter.gte = new Date(desde).toISOString()
      if (hasta) dateFilter.lte = new Date(hasta).toISOString()
      where.date = dateFilter
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        order: {
          select: { id: true, internalNumber: true, clientName: true, clientSurname: true },
        },
      },
    })

    return Response.json(transactions)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return Response.json({ error: "Error al cargar transacciones" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const body = await request.json()
    const parsed = createTransactionSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
    }

    const { type, concept, amountUSD, amountARS, date, notes, orderId } = parsed.data

    const transaction = await prisma.transaction.create({
      data: {
        id: genId(),
        type,
        concept,
        amountUSD,
        amountARS: amountARS || null,
        date: date ? new Date(date) : new Date(),
        notes: notes || null,
        orderId: orderId || null,
      },
    })

    if (orderId) {
      await recalculatePaymentStatus(orderId)
    }

    return Response.json(transaction, { status: 201 })
  } catch (error) {
    console.error("Error creating transaction:", error)
    return Response.json({ error: "Error al crear transacción" }, { status: 500 })
  }
}
