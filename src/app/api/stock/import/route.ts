import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import * as XLSX from "xlsx"
import { genId, slugify } from "@/lib/utils"
import { requireRole } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole("admin")
    if (session instanceof Response) return session

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return Response.json({ error: "No se recibió ningún archivo" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet)

    if (rows.length === 0) {
      return Response.json({ error: "El archivo está vacío" }, { status: 400 })
    }

    const headers = Object.keys(rows[0]).map((h) => h.toLowerCase().trim())

    const nameCol = headers.find((h) => /nombre|name|producto/.test(h))
    const priceCol = headers.find((h) => /precio|price|usd/.test(h))
    const stockCol = headers.find((h) => /stock|cantidad|qty/.test(h))
    const catCol = headers.find((h) => /categoria|categoría|category/.test(h))

    if (!nameCol) {
      return Response.json({ error: "No se encontró columna de nombre/producto" }, { status: 400 })
    }

    const created: string[] = []
    const updated: string[] = []
    const errors: { row: number; error: string }[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const name = String(row[Object.keys(row)[headers.indexOf(nameCol)]] || "").trim()
        if (!name) {
          errors.push({ row: i + 1, error: "Nombre vacío" })
          continue
        }

        const slug = slugify(name)
        const price = priceCol ? parseFloat(String(row[Object.keys(row)[headers.indexOf(priceCol)]] || "0")) : 0
        const stock = stockCol ? parseInt(String(row[Object.keys(row)[headers.indexOf(stockCol)]] || "0")) || 0 : 0
        let categoryId: string | null = null

        if (catCol) {
          const catName = String(row[Object.keys(row)[headers.indexOf(catCol)]] || "").trim()
          if (catName) {
            const catSlug = slugify(catName)
            let category = await prisma.category.findUnique({ where: { slug: catSlug } })
            if (!category) {
              category = await prisma.category.create({
                data: { id: genId(), name: catName, slug: catSlug },
              })
            }
            categoryId = category.id
          }
        }

        const existing = await prisma.product.findUnique({ where: { slug } })

        if (existing) {
          await prisma.product.update({
            where: { slug },
            data: {
              priceUSD: price || existing.priceUSD,
              stock: stock >= 0 ? stock : existing.stock,
              categoryId: categoryId || existing.categoryId,
            },
          })
          updated.push(name)
        } else {
          await prisma.product.create({
            data: {
              id: genId(),
              name,
              slug,
              priceUSD: price || 0,
              stock,
              categoryId,
            },
          })
          created.push(name)
        }
      } catch (err) {
        errors.push({ row: i + 1, error: String(err) })
      }
    }

    return Response.json({
      success: true,
      summary: { created: created.length, updated: updated.length, errors: errors.length },
      created,
      updated,
      errors,
    })
  } catch (error) {
    console.error("Error importing Excel:", error)
    return Response.json({ error: "Error al importar archivo" }, { status: 500 })
  }
}
