import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"
import { generateCsv, formatProductRow } from "@/lib/csv"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("categoryId")
    const available = searchParams.get("available")
    const search = searchParams.get("search")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { deletedAt: null }

    if (categoryId) {
      where.categoryId = categoryId
    }
    if (available === "true") {
      where.isAvailable = true
    } else if (available === "false") {
      where.isAvailable = false
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ]
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    })

    const csvRows = products.map((p) =>
      formatProductRow(p as unknown as Record<string, unknown>)
    )

    const csvContent = generateCsv(csvRows)

    const date = new Date().toISOString().slice(0, 10)
    const filename = `products-export-${date}.csv`

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("CSV export error:", error)
    return Response.json(
      { error: "Error al exportar productos" },
      { status: 500 }
    )
  }
}
