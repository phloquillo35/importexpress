/**
 * CSV Import/Export helpers for products.
 *
 * Design decisions (Stripe-style):
 * - UTF-8 BOM for Excel compatibility on export
 * - JSON fields (images, specs, angles, angleMeta) serialized as JSON strings
 * - Slug is the unique key for upsert
 * - Dry-run mode returns preview without touching DB
 * - Each row gets an individual error report (never abort on first error)
 */

// ── Column definitions ──────────────────────────────────────────────

export const CSV_COLUMNS = [
  "slug",
  "name",
  "description",
  "priceUSD",
  "priceARS",
  "costUSDT",
  "costUSD",
  "yoniEnabled",
  "yoniType",
  "yoniValue",
  "shippingCost",
  "profitType",
  "profitValue",
  "stock",
  "minStock",
  "isAvailable",
  "isFeatured",
  "freeShipping",
  "hasFinancing",
  "categoryName",
  "images",
  "specs",
  "angles",
  "angleMeta",
] as const

export type CsvColumn = (typeof CSV_COLUMNS)[number]

const REQUIRED_COLUMNS: CsvColumn[] = ["slug", "name"]

// ── CSV Parsing ─────────────────────────────────────────────────────

/**
 * Parse a single CSV field, handling quoted fields with commas/newlines.
 */
function parseCsvField(line: string, start: number): { value: string; end: number } {
  if (start >= line.length) return { value: "", end: start }

  // Quoted field
  if (line[start] === '"') {
    let value = ""
    let i = start + 1
    while (i < line.length) {
      if (line[i] === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Escaped quote
          value += '"'
          i += 2
        } else {
          // End of quoted field
          i++ // skip closing quote
          // Skip to next delimiter
          while (i < line.length && line[i] !== ",") i++
          return { value, end: i + 1 } // +1 to skip comma
        }
      } else {
        value += line[i]
        i++
      }
    }
    return { value, end: i }
  }

  // Unquoted field
  let end = line.indexOf(",", start)
  if (end === -1) end = line.length
  return { value: line.slice(start, end), end: end + 1 }
}

/**
 * Parse CSV text into an array of objects keyed by header row.
 * Handles: quoted fields, commas inside quotes, BOM prefix.
 */
export function parseCsv(csvText: string): Record<string, string>[] {
  // Strip BOM if present
  const text = csvText.replace(/^\uFEFF/, "")
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "")

  if (lines.length < 2) return []

  // Parse header
  const headers: string[] = []
  let pos = 0
  const headerLine = lines[0]
  while (pos <= headerLine.length) {
    const { value, end } = parseCsvField(headerLine, pos)
    headers.push(value.trim())
    if (end > headerLine.length) break
    pos = end
  }

  // Parse rows
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const row: Record<string, string> = {}
    pos = 0
    for (let h = 0; h < headers.length; h++) {
      const { value, end } = parseCsvField(lines[i], pos)
      row[headers[h]] = value
      pos = end
    }
    // Only add rows that have at least one non-empty value
    if (Object.values(row).some((v) => v.trim() !== "")) {
      rows.push(row)
    }
  }

  return rows
}

// ── Validation ──────────────────────────────────────────────────────

export interface ValidationError {
  row: number
  field: string
  message: string
}

export interface CsvRow {
  slug: string
  name: string
  description?: string
  priceUSD?: number
  priceARS?: number
  costUSDT?: number
  costUSD?: number
  yoniEnabled?: boolean
  yoniType?: string
  yoniValue?: number
  shippingCost?: number
  profitType?: string
  profitValue?: number
  stock?: number
  minStock?: number
  isAvailable?: boolean
  isFeatured?: boolean
  freeShipping?: boolean
  hasFinancing?: boolean
  categoryName?: string
  images?: unknown
  specs?: unknown
  angles?: unknown
  angleMeta?: unknown
}

function parseJsonField(value: string, fieldName: string): unknown {
  if (!value || value.trim() === "") return undefined
  try {
    return JSON.parse(value)
  } catch {
    throw new Error(`Campo "${fieldName}" no es JSON válido: ${value.slice(0, 50)}...`)
  }
}

function parseBool(value: string): boolean {
  const v = value.trim().toLowerCase()
  return v === "true" || v === "1" || v === "yes" || v === "sí" || v === "si"
}

function parseNumber(value: string, fieldName: string): number | undefined {
  if (!value || value.trim() === "") return undefined
  const n = Number(value)
  if (isNaN(n)) throw new Error(`Campo "${fieldName}" no es un número válido: "${value}"`)
  return n
}

/**
 * Validate and parse a single CSV row into a CsvRow.
 * Returns the parsed row + any validation errors for that row.
 */
export function validateRow(
  raw: Record<string, string>,
  rowIndex: number
): { row: CsvRow | null; errors: ValidationError[] } {
  const errors: ValidationError[] = []

  // Check required columns exist in CSV header
  for (const col of REQUIRED_COLUMNS) {
    if (!(col in raw)) {
      errors.push({ row: rowIndex, field: col, message: `Columna requerida "${col}" no encontrada en CSV` })
    }
  }

  if (errors.length > 0) return { row: null, errors }

  const slug = raw.slug?.trim()
  const name = raw.name?.trim()

  if (!slug) {
    errors.push({ row: rowIndex, field: "slug", message: "Slug no puede estar vacío" })
  }
  if (!name) {
    errors.push({ row: rowIndex, field: "name", message: "Nombre no puede estar vacío" })
  }

  if (errors.length > 0) return { row: null, errors }

  // Parse optional fields with error handling
  try {
    const row: CsvRow = {
      slug: slug!,
      name: name!,
      description: raw.description?.trim() || undefined,
    }

    // Numeric fields
    const numericFields: Array<[string, keyof CsvRow]> = [
      ["priceUSD", "priceUSD"],
      ["priceARS", "priceARS"],
      ["costUSDT", "costUSDT"],
      ["costUSD", "costUSD"],
      ["yoniValue", "yoniValue"],
      ["shippingCost", "shippingCost"],
      ["profitValue", "profitValue"],
      ["stock", "stock"],
      ["minStock", "minStock"],
    ]

    for (const [csvCol, rowField] of numericFields) {
      if (raw[csvCol] && raw[csvCol].trim() !== "") {
        try {
          ;(row as unknown as Record<string, unknown>)[rowField] = parseNumber(raw[csvCol], csvCol)
        } catch (e) {
          errors.push({ row: rowIndex, field: csvCol, message: (e as Error).message })
        }
      }
    }

    // Boolean fields
    const boolFields: Array<[string, keyof CsvRow]> = [
      ["yoniEnabled", "yoniEnabled"],
      ["isAvailable", "isAvailable"],
      ["isFeatured", "isFeatured"],
      ["freeShipping", "freeShipping"],
      ["hasFinancing", "hasFinancing"],
    ]

    for (const [csvCol, rowField] of boolFields) {
      if (raw[csvCol] && raw[csvCol].trim() !== "") {
        ;(row as unknown as Record<string, unknown>)[rowField] = parseBool(raw[csvCol])
      }
    }

    // String enum fields
    if (raw.yoniType?.trim()) row.yoniType = raw.yoniType.trim()
    if (raw.profitType?.trim()) row.profitType = raw.profitType.trim()
    if (raw.categoryName?.trim()) row.categoryName = raw.categoryName.trim()

    // JSON fields
    const jsonFields: Array<[string, keyof CsvRow]> = [
      ["images", "images"],
      ["specs", "specs"],
      ["angles", "angles"],
      ["angleMeta", "angleMeta"],
    ]

    for (const [csvCol, rowField] of jsonFields) {
      if (raw[csvCol] && raw[csvCol].trim() !== "") {
        try {
          ;(row as unknown as Record<string, unknown>)[rowField] = parseJsonField(raw[csvCol], csvCol)
        } catch (e) {
          errors.push({ row: rowIndex, field: csvCol, message: (e as Error).message })
        }
      }
    }

    if (errors.length > 0) return { row: null, errors }
    return { row, errors: [] }
  } catch (e) {
    errors.push({ row: rowIndex, field: "*", message: (e as Error).message })
    return { row: null, errors }
  }
}

// ── Export formatting ────────────────────────────────────────────────

/**
 * Escape a value for CSV output.
 * Quotes the field if it contains commas, quotes, or newlines.
 */
function csvEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Format a product row for CSV export.
 * JSON fields are serialized as JSON strings.
 */
export function formatProductRow(product: Record<string, unknown>): string {
  const category = product.category as Record<string, unknown> | null | undefined

  const fields = [
    product.slug,
    product.name,
    product.description,
    product.priceUSD,
    product.priceARS,
    product.costUSDT,
    product.costUSD,
    product.yoniEnabled,
    product.yoniType,
    product.yoniValue,
    product.shippingCost,
    product.profitType,
    product.profitValue,
    product.stock,
    product.minStock,
    product.isAvailable,
    product.isFeatured,
    product.freeShipping,
    product.hasFinancing,
    category?.name,
    product.images != null ? JSON.stringify(product.images) : "",
    product.specs != null ? JSON.stringify(product.specs) : "",
    product.angles != null ? JSON.stringify(product.angles) : "",
    product.angleMeta != null ? JSON.stringify(product.angleMeta) : "",
  ]

  return fields.map((f) => csvEscape(f as string)).join(",")
}

/**
 * Generate a complete CSV string with BOM header.
 */
export function generateCsv(rows: string[]): string {
  const BOM = "\uFEFF"
  const header = CSV_COLUMNS.join(",")
  return BOM + header + "\n" + rows.join("\n") + "\n"
}

// ── Import result types ─────────────────────────────────────────────

export interface ImportResultRow {
  slug: string
  action: "create" | "update" | "error" | "skip"
  message: string
}

export interface ImportResult {
  dryRun: boolean
  totalRows: number
  validRows: number
  created: number
  updated: number
  skipped: number
  errors: number
  rows: ImportResultRow[]
  validationErrors: ValidationError[]
}
