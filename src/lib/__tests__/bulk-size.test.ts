import { describe, it, expect } from "vitest"
import { detectBulkSize } from "@/lib/bulk-size"

describe("detectBulkSize", () => {
  it("should detect grande by product name", () => {
    expect(detectBulkSize("Smart TV 55 4K", "")).toBe("grande")
    expect(detectBulkSize("Microondas Inverter 30L", "")).toBe("grande")
    expect(detectBulkSize("Heladera No Frost", "")).toBe("grande")
    expect(detectBulkSize("Lavarropas 8kg", "")).toBe("grande")
    expect(detectBulkSize("Aire Acondicionado 3200", "")).toBe("grande")
  })

  it("should detect chico by default", () => {
    expect(detectBulkSize("Auriculares Bluetooth", "")).toBe("chico")
    expect(detectBulkSize("Celular Xiaomi POCO C81", "")).toBe("chico")
    expect(detectBulkSize("Cargador USB-C 65W", "")).toBe("chico")
  })

  it("should detect grande by category name", () => {
    expect(detectBulkSize("Producto X", "Televisores")).toBe("grande")
    expect(detectBulkSize("Producto Y", "Accesorios")).toBe("chico")
  })

  it("should handle empty name", () => {
    expect(detectBulkSize("", "")).toBe("chico")
  })
})
