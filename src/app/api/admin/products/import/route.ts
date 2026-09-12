import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth"
import { parseCsv, validateRow, type ImportResult, type ImportResultRow, type ValidationError } from "@/lib/csv"
import { calculateFinalPrice, type PricingInput } from "@/lib/pricing"

interface ImportRequestBody {
  csv: string
  dryRun?: boolean
}

function slugExists(slug: string, existingSlugs: Set<string>): boolean {
  return existingSlugs.has(slug)
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole("admin")
    if (authResult instanceof Response) return authResult

    const body: ImportRequestBody = await request.json()
    const { csv, dryRun = true } = body

    if (!csv || typeof csv !== "string") {
      return Response.json(
        { error: "Se requiere un campo 'csv' con el contenido CSV" },
        { status: 400 }
      )
    }

    // Parse CSV
    const rawRows = parseCsv(csv)

    if (rawRows.length === 0) {
      return Response.json(
        { error: "El CSV está vacío o no tiene filas de datos" },
        { status: 400 }
      )
    }

    // Validate all rows
    const allValidationErrors: ValidationError[] = []
    type ValidatedRow = NonNullable<ReturnType<typeof validateRow>["row"]>
    const validRows: Array<{ index: number; row: ValidatedRow }> = []

    for (let i = 0; i < rawRows.length; i++) {
      const { row, errors } = validateRow(rawRows[i], i + 2) // +2 for 1-indexed + header
      if (errors.length > 0) {
        allValidationErrors.push(...errors)
      }
      if (row) {
        validRows.push({ index: i, row })
      }
    }

    if (validRows.length === 0) {
      return Response.json({
        dryRun,
        totalRows: rawRows.length,
        validRows: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: rawRows.length,
        rows: [] as ImportResultRow[],
        validationErrors: allValidationErrors,
      } satisfies ImportResult)
    }

    // Get existing slugs to determine create vs update
    const slugs = validRows.map((r) => r.row.slug)
    const existingProducts = await prisma.product.findMany({
      where: { slug: { in: slugs } },
      select: {
        slug: true, costUSDT: true, yoniEnabled: true, yoniType: true, yoniValue: true,
        shippingCost: true, profitType: true, profitValue: true,
      },
    })
    const existingSlugs = new Set(existingProducts.map((p) => p.slug))
    const existingBySlug = new Map(existingProducts.map((p) => [p.slug, p]))

    const [exchangeRateSetting, usdtRateSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "exchange_rate" } }),
      prisma.setting.findUnique({ where: { key: "usdt_rate" } }),
    ])
    const exchangeRate = parseFloat(exchangeRateSetting?.value || "1350")
    const usdtRate = parseFloat(usdtRateSetting?.value || "1400")

    // Get category map for name→id resolution
    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
    })
    const categoryNameToId = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))

    const resultRows: ImportResultRow[] = []

    if (dryRun) {
      // Dry-run: preview changes without applying
      for (const { row } of validRows) {
        const exists = slugExists(row.slug, existingSlugs)

        resultRows.push({
          slug: row.slug,
          action: exists ? "update" : "create",
          message: exists
            ? `Se actualizará el producto existente`
            : `Se creará un nuevo producto`,
        })
      }

      return Response.json({
        dryRun: true,
        totalRows: rawRows.length,
        validRows: validRows.length,
        created: resultRows.filter((r) => r.action === "create").length,
        updated: resultRows.filter((r) => r.action === "update").length,
        skipped: 0,
        errors: allValidationErrors.length,
        rows: resultRows,
        validationErrors: allValidationErrors,
      } satisfies ImportResult)
    }

    // Apply mode: upsert products
    let created = 0
    let updated = 0
    let skipped = 0

    for (const { row } of validRows) {
      try {
        const exists = slugExists(row.slug, existingSlugs)
        const categoryId = row.categoryName
          ? categoryNameToId.get(row.categoryName.toLowerCase()) ?? null
          : undefined

        // El precio final (finalPriceUSD/ARS, subtotal, ganancia) nunca viene del CSV
        // directamente — se recalcula siempre con el mismo motor que usa el form manual,
        // combinando lo que trae la fila con lo que el producto ya tenía (para updates
        // parciales que no repiten todas las columnas de costo).
        const existingPricing = existingBySlug.get(row.slug)
        const pricingInput: PricingInput = {
          costUSDT: row.costUSDT ?? existingPricing?.costUSDT ?? 0,
          yoniEnabled: row.yoniEnabled ?? existingPricing?.yoniEnabled ?? false,
          yoniType: (row.yoniType ?? existingPricing?.yoniType ?? "percentage") as PricingInput["yoniType"],
          yoniValue: row.yoniValue ?? existingPricing?.yoniValue ?? 0,
          shippingCost: row.shippingCost ?? existingPricing?.shippingCost ?? 0,
          profitType: (row.profitType ?? existingPricing?.profitType ?? "percentage") as PricingInput["profitType"],
          profitValue: row.profitValue ?? existingPricing?.profitValue ?? 0,
          exchangeRate,
          usdtRate,
        }
        const pricing = calculateFinalPrice(pricingInput)

        const data: Record<string, unknown> = {
          finalPriceUSD: pricing.finalPriceUSD,
          finalPriceARS: pricing.finalPriceARS,
          subtotalARS: pricing.subtotalARS,
          profitARS: pricing.profitARS,
          priceARS: pricing.finalPriceARS,
          priceUSD: pricing.finalPriceUSD,
          name: row.name,
          ...(row.description !== undefined && { description: row.description }),
          ...(row.priceUSD !== undefined && { priceUSD: row.priceUSD }),
          ...(row.priceARS !== undefined && { priceARS: row.priceARS }),
          ...(row.costUSDT !== undefined && { costUSDT: row.costUSDT }),
          ...(row.costUSD !== undefined && { costUSD: row.costUSD }),
          ...(row.yoniEnabled !== undefined && { yoniEnabled: row.yoniEnabled }),
          ...(row.yoniType && { yoniType: row.yoniType }),
          ...(row.yoniValue !== undefined && { yoniValue: row.yoniValue }),
          ...(row.shippingCost !== undefined && { shippingCost: row.shippingCost }),
          ...(row.profitType && { profitType: row.profitType }),
          ...(row.profitValue !== undefined && { profitValue: row.profitValue }),
          ...(row.stock !== undefined && { stock: row.stock }),
          ...(row.minStock !== undefined && { minStock: row.minStock }),
          ...(row.isAvailable !== undefined && { isAvailable: row.isAvailable }),
          ...(row.isFeatured !== undefined && { isFeatured: row.isFeatured }),
          ...(row.freeShipping !== undefined && { freeShipping: row.freeShipping }),
          ...(row.hasFinancing !== undefined && { hasFinancing: row.hasFinancing }),
          ...(categoryId !== undefined && { categoryId }),
          ...(row.images !== undefined && { images: row.images }),
          ...(row.specs !== undefined && { specs: row.specs }),
          ...(row.angles !== undefined && { angles: row.angles }),
          ...(row.angleMeta !== undefined && { angleMeta: row.angleMeta }),
        }

        if (exists) {
          await prisma.product.update({
            where: { slug: row.slug },
            data,
          })
          updated++
          resultRows.push({
            slug: row.slug,
            action: "update",
            message: "Producto actualizado",
          })
        } else {
          await prisma.product.create({
            data: {
              id: crypto.randomUUID(),
              slug: row.slug,
              name: row.name,
              priceUSD: pricing.finalPriceUSD,
              ...data,
            },
          })
          created++
          resultRows.push({
            slug: row.slug,
            action: "create",
            message: "Producto creado",
          })
        }
      } catch (e) {
        skipped++
        resultRows.push({
          slug: row.slug,
          action: "error",
          message: (e as Error).message,
        })
      }
    }

    return Response.json({
      dryRun: false,
      totalRows: rawRows.length,
      validRows: validRows.length,
      created,
      updated,
      skipped,
      errors: allValidationErrors.length + skipped,
      rows: resultRows,
      validationErrors: allValidationErrors,
    } satisfies ImportResult)
  } catch (error) {
    console.error("CSV import error:", error)
    return Response.json(
      { error: "Error al importar productos" },
      { status: 500 }
    )
  }
}
