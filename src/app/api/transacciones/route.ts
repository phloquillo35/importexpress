import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { genId } from "@/lib/utils"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get("tipo")
    const desde = searchParams.get("desde")
    const hasta = searchParams.get("hasta")

    const where: Record<string, unknown> = {}

    if (tipo) where.type = tipo
    if (desde || hasta) {
      const dateFilter: Record<string, string> = {}
      if (desde) dateFilter.gte = new Date(desde).toISOString()
      if (hasta) dateFilter.lte = new Date(hasta).toISOString()
      where.date = dateFilter
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
    })

    return Response.json(transactions)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return Response.json({ error: "Error al cargar transacciones" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, concept, amountUSD, amountARS, date, notes } = body

    if (!type || !concept || amountUSD === undefined) {
      return Response.json({ error: "type, concept y amountUSD son requeridos" }, { status: 400 })
    }

    const transaction = await prisma.transaction.create({
      data: {
        id: genId(),
        type,
        concept,
        amountUSD: parseFloat(amountUSD),
        amountARS: amountARS ? parseFloat(amountARS) : null,
        date: date ? new Date(date) : new Date(),
        notes: notes || null,
      },
    })

    return Response.json(transaction, { status: 201 })
  } catch (error) {
    console.error("Error creating transaction:", error)
    return Response.json({ error: "Error al crear transacción" }, { status: 500 })
  }
}
