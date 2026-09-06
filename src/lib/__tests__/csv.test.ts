import { describe, it, expect } from "vitest"
import {
  parseCsv,
  validateRow,
  formatProductRow,
  generateCsv,
  CSV_COLUMNS,
} from "@/lib/csv"

// ── parseCsv ────────────────────────────────────────────────────────

describe("parseCsv", () => {
  it("should parse a simple CSV with header and rows", () => {
    const csv = "slug,name,priceUSD\niphone-17,iPhone 17,999.99\nipad-air,iPad Air,599.00"
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ slug: "iphone-17", name: "iPhone 17", priceUSD: "999.99" })
    expect(rows[1]).toEqual({ slug: "ipad-air", name: "iPad Air", priceUSD: "599.00" })
  })

  it("should handle BOM prefix", () => {
    const csv = "\uFEFFslug,name\ntest,Test Product"
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].slug).toBe("test")
  })

  it("should handle quoted fields with commas", () => {
    const csv = 'slug,name,description\ntest,"Product, with comma","Has, multiple, commas"'
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe("Product, with comma")
    expect(rows[0].description).toBe("Has, multiple, commas")
  })

  it("should handle quoted fields with escaped quotes", () => {
    const csv = 'slug,name\ntest,"He said ""hello"""'
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('He said "hello"')
  })

  it("should skip empty lines", () => {
    const csv = "slug,name\n\n\ntest,Product\n\n"
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(1)
  })

  it("should return empty array for header-only CSV", () => {
    const csv = "slug,name,priceUSD"
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(0)
  })

  it("should return empty array for empty string", () => {
    expect(parseCsv("")).toHaveLength(0)
  })

  it("should handle CRLF line endings", () => {
    const csv = "slug,name\r\ntest,Product\r\n"
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(1)
  })
})

// ── validateRow ─────────────────────────────────────────────────────

describe("validateRow", () => {
  it("should validate a correct row", () => {
    const raw = { slug: "iphone-17", name: "iPhone 17", priceUSD: "999.99", stock: "10" }
    const { row, errors } = validateRow(raw, 2)
    expect(errors).toHaveLength(0)
    expect(row).not.toBeNull()
    expect(row!.slug).toBe("iphone-17")
    expect(row!.name).toBe("iPhone 17")
    expect(row!.priceUSD).toBe(999.99)
    expect(row!.stock).toBe(10)
  })

  it("should require slug", () => {
    const raw = { name: "iPhone 17" }
    const { row, errors } = validateRow(raw, 2)
    expect(row).toBeNull()
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].field).toBe("slug")
  })

  it("should require name", () => {
    const raw = { slug: "iphone-17" }
    const { row, errors } = validateRow(raw, 2)
    expect(row).toBeNull()
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].field).toBe("name")
  })

  it("should reject empty slug", () => {
    const raw = { slug: "  ", name: "iPhone" }
    const { row, errors } = validateRow(raw, 2)
    expect(row).toBeNull()
    expect(errors.some((e) => e.field === "slug")).toBe(true)
  })

  it("should parse boolean fields", () => {
    const raw = { slug: "test", name: "Test", isAvailable: "true", isFeatured: "false" }
    const { row } = validateRow(raw, 2)
    expect(row!.isAvailable).toBe(true)
    expect(row!.isFeatured).toBe(false)
  })

  it("should parse boolean '1' and '0'", () => {
    const raw = { slug: "test", name: "Test", isAvailable: "1", isFeatured: "0" }
    const { row } = validateRow(raw, 2)
    expect(row!.isAvailable).toBe(true)
    expect(row!.isFeatured).toBe(false)
  })

  it("should parse JSON fields", () => {
    const raw = {
      slug: "test",
      name: "Test",
      images: '["url1.jpg","url2.jpg"]',
      specs: '{"color":"red"}',
    }
    const { row } = validateRow(raw, 2)
    expect(row!.images).toEqual(["url1.jpg", "url2.jpg"])
    expect(row!.specs).toEqual({ color: "red" })
  })

  it("should report invalid JSON", () => {
    const raw = { slug: "test", name: "Test", images: "not-json" }
    const { row, errors } = validateRow(raw, 2)
    expect(row).toBeNull()
    expect(errors.some((e) => e.field === "images")).toBe(true)
  })

  it("should reject invalid number", () => {
    const raw = { slug: "test", name: "Test", priceUSD: "not-a-number" }
    const { row, errors } = validateRow(raw, 2)
    expect(row).toBeNull()
    expect(errors.some((e) => e.field === "priceUSD")).toBe(true)
  })

  it("should handle empty optional fields gracefully", () => {
    const raw = { slug: "test", name: "Test", priceUSD: "", stock: "" }
    const { row, errors } = validateRow(raw, 2)
    expect(errors).toHaveLength(0)
    expect(row).not.toBeNull()
    expect(row!.priceUSD).toBeUndefined()
    expect(row!.stock).toBeUndefined()
  })

  it("should use correct row number in errors (1-indexed, +header)", () => {
    const raw = { name: "Test" }
    const { errors } = validateRow(raw, 5)
    expect(errors[0].row).toBe(5)
  })
})

// ── formatProductRow ────────────────────────────────────────────────

describe("formatProductRow", () => {
  it("should format a product with all fields", () => {
    const product = {
      slug: "iphone-17",
      name: "iPhone 17",
      description: "Latest iPhone",
      priceUSD: 999.99,
      priceARS: 999999,
      costUSDT: 800,
      costUSD: 800,
      yoniEnabled: true,
      yoniType: "percentage",
      yoniValue: 25,
      shippingCost: 5000,
      profitType: "percentage",
      profitValue: 30,
      stock: 10,
      minStock: 5,
      isAvailable: true,
      isFeatured: false,
      freeShipping: false,
      hasFinancing: false,
      category: { name: "Celulares" },
      images: ["url1.jpg", "url2.jpg"],
      specs: { color: "black" },
      angles: { front: "url1.jpg" },
      angleMeta: { category: "C1" },
    }

    const row = formatProductRow(product)
    expect(row).toContain("iphone-17")
    expect(row).toContain("iPhone 17")
    expect(row).toContain("999.99")
    expect(row).toContain("Celulares")
    // JSON arrays get double-quoted in CSV (commas inside quotes)
    expect(row).toContain('"url1.jpg"')
    // JSON objects with special chars also get double-quoted with escaped quotes
    expect(row).toContain('color')
  })

  it("should handle null/undefined optional fields", () => {
    const product = {
      slug: "test",
      name: "Test",
      description: null,
      priceUSD: 100,
      category: null,
      images: null,
      specs: undefined,
      angles: undefined,
      angleMeta: undefined,
    }

    const row = formatProductRow(product)
    const columns = row.split(",")
    // Should have correct number of columns
    expect(columns.length).toBe(CSV_COLUMNS.length)
  })

  it("should escape fields with commas", () => {
    const product = {
      slug: "test",
      name: "Product, with comma",
      category: null,
    }
    const row = formatProductRow(product)
    expect(row).toContain('"Product, with comma"')
  })
})

// ── generateCsv ─────────────────────────────────────────────────────

describe("generateCsv", () => {
  it("should generate CSV with BOM and header", () => {
    const csv = generateCsv(["row1,row2"])
    expect(csv.startsWith("\uFEFF")).toBe(true)
    expect(csv).toContain(CSV_COLUMNS.join(","))
    expect(csv).toContain("row1,row2")
  })

  it("should handle empty rows", () => {
    const csv = generateCsv([])
    expect(csv.startsWith("\uFEFF")).toBe(true)
    expect(csv).toContain(CSV_COLUMNS.join(","))
  })

  it("should include all expected columns", () => {
    const csv = generateCsv([])
    for (const col of CSV_COLUMNS) {
      expect(csv).toContain(col)
    }
  })
})
