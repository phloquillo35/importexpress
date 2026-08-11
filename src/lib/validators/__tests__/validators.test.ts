import { describe, it, expect } from "vitest"
import {
  createProductSchema,
  updateProductSchema,
} from "@/lib/validators/product"
import {
  createCategorySchema,
  updateCategorySchema,
} from "@/lib/validators/category"
import {
  createOrderSchema,
  updateOrderSchema,
  registerPaymentSchema,
} from "@/lib/validators/order"
import {
  createBulkSchema,
  updateBulkSchema,
} from "@/lib/validators/bulk"
import {
  createTransactionSchema,
  updateTransactionSchema,
} from "@/lib/validators/transaction"
import {
  createStoreSchema,
  updateStoreSchema,
} from "@/lib/validators/store"
import { updateSettingSchema } from "@/lib/validators/setting"

describe("Validators - Product", () => {
  describe("createProductSchema", () => {
    it("should validate a valid product", () => {
      const validProduct = {
        name: "Test Product",
        costUSDT: 10,
      }
      const result = createProductSchema.safeParse(validProduct)
      expect(result.success).toBe(true)
    })

    it("should require name", () => {
      const invalidProduct = {
        costUSDT: 10,
      }
      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("name")
      }
    })

    it("should validate yoniType enum", () => {
      const invalidProduct = {
        name: "Test",
        costUSDT: 10,
        yoniType: "invalid_type",
      }
      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
    })

    it("should validate profitType enum", () => {
      const invalidProduct = {
        name: "Test",
        costUSDT: 10,
        profitType: "invalid_type",
      }
      const result = createProductSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
    })

    it("should set defaults for optional fields", () => {
      const product = {
        name: "Test",
        costUSDT: 10,
      }
      const result = createProductSchema.parse(product)
      expect(result.yoniEnabled).toBe(false)
      expect(result.yoniType).toBe("percentage")
      expect(result.yoniValue).toBe(25)
      expect(result.hasFinancing).toBe(false)
      expect(result.shippingCost).toBe(0)
      expect(result.profitType).toBe("percentage")
      expect(result.profitValue).toBe(0)
      expect(result.stock).toBe(0)
      expect(result.minStock).toBe(0)
      expect(result.isAvailable).toBe(true)
      expect(result.isFeatured).toBe(false)
      expect(result.freeShipping).toBe(false)
    })

    it("should accept valid images array with strings", () => {
      const product = {
        name: "Test",
        costUSDT: 10,
        images: ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
      }
      const result = createProductSchema.safeParse(product)
      expect(result.success).toBe(true)
    })

    it("should accept valid images array with objects", () => {
      const product = {
        name: "Test",
        costUSDT: 10,
        images: [{ url: "https://example.com/img1.jpg", color: "red" }],
      }
      const result = createProductSchema.safeParse(product)
      expect(result.success).toBe(true)
    })
  })

  describe("updateProductSchema", () => {
    it("should allow partial updates", () => {
      const partialUpdate = { name: "Updated Name" }
      const result = updateProductSchema.safeParse(partialUpdate)
      expect(result.success).toBe(true)
    })

    it("should validate fields when provided", () => {
      const invalidUpdate = { yoniType: "invalid" }
      const result = updateProductSchema.safeParse(invalidUpdate)
      expect(result.success).toBe(false)
    })
  })
})

describe("Validators - Category", () => {
  describe("createCategorySchema", () => {
    it("should validate a valid category", () => {
      const validCategory = { name: "Electronics" }
      const result = createCategorySchema.safeParse(validCategory)
      expect(result.success).toBe(true)
    })

    it("should require name", () => {
      const result = createCategorySchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it("should accept optional fields", () => {
      const category = {
        name: "Electronics",
        description: "Electronic devices",
        image: "https://example.com/cat.jpg",
        parentId: "parent-id",
        subcategories: ["sub1", "sub2"],
      }
      const result = createCategorySchema.safeParse(category)
      expect(result.success).toBe(true)
    })
  })

  describe("updateCategorySchema", () => {
    it("should allow partial updates", () => {
      const result = updateCategorySchema.safeParse({ description: "Updated" })
      expect(result.success).toBe(true)
    })
  })
})

describe("Validators - Order", () => {
  describe("createOrderSchema", () => {
    it("should validate a valid order", () => {
      const validOrder = {
        clientName: "John Doe",
        items: [{ productId: "prod-1", quantity: 2 }],
      }
      const result = createOrderSchema.safeParse(validOrder)
      expect(result.success).toBe(true)
    })

    it("should require clientName", () => {
      const result = createOrderSchema.safeParse({ items: [] })
      expect(result.success).toBe(false)
    })

    it("should require items array", () => {
      const result = createOrderSchema.safeParse({ clientName: "John" })
      expect(result.success).toBe(false)
    })

    it("should validate item quantity is positive integer", () => {
      const order = {
        clientName: "John",
        items: [{ productId: "prod-1", quantity: 0 }],
      }
      const result = createOrderSchema.safeParse(order)
      expect(result.success).toBe(false)
    })

    it("should accept optional fields", () => {
      const order = {
        clientName: "John",
        clientSurname: "Doe",
        clientPhone: "+1234567890",
        clientEmail: "john@example.com",
        clientContact: "WhatsApp",
        items: [{ productId: "prod-1", quantity: 1, priceUSD: 10 }],
        totalUSD: 10,
        notes: "Urgent",
        status: "pending",
      }
      const result = createOrderSchema.safeParse(order)
      expect(result.success).toBe(true)
    })
  })

  describe("updateOrderSchema", () => {
    it("should validate paymentStatus enum", () => {
      const update = { paymentStatus: "pagado" }
      const result = updateOrderSchema.safeParse(update)
      expect(result.success).toBe(true)
    })

    it("should reject invalid paymentStatus", () => {
      const update = { paymentStatus: "invalid" }
      const result = updateOrderSchema.safeParse(update)
      expect(result.success).toBe(false)
    })

    it("should validate amountPaidUSD is non-negative", () => {
      const update = { amountPaidUSD: -1 }
      const result = updateOrderSchema.safeParse(update)
      expect(result.success).toBe(false)
    })
  })

  describe("registerPaymentSchema", () => {
    it("should validate a valid payment", () => {
      const payment = { amount: 100, currency: "USD" }
      const result = registerPaymentSchema.safeParse(payment)
      expect(result.success).toBe(true)
    })

    it("should require positive amount", () => {
      const result = registerPaymentSchema.safeParse({ amount: 0, currency: "USD" })
      expect(result.success).toBe(false)
    })

    it("should validate currency enum", () => {
      const result = registerPaymentSchema.safeParse({ amount: 100, currency: "EUR" })
      expect(result.success).toBe(false)
    })
  })
})

describe("Validators - Bulk", () => {
  describe("createBulkSchema", () => {
    it("should validate a valid bulk", () => {
      const bulk = { type: "grande", courier: "buspack" }
      const result = createBulkSchema.safeParse(bulk)
      expect(result.success).toBe(true)
    })

    it("should validate type enum", () => {
      const bulk = { type: "invalid" }
      const result = createBulkSchema.safeParse(bulk)
      expect(result.success).toBe(false)
    })

    it("should validate courier enum", () => {
      const bulk = { courier: "invalid" }
      const result = createBulkSchema.safeParse(bulk)
      expect(result.success).toBe(false)
    })

    it("should validate status enum", () => {
      const bulk = { status: "invalid" }
      const result = createBulkSchema.safeParse(bulk)
      expect(result.success).toBe(false)
    })

    it("should accept all optional fields", () => {
      const bulk = {
        type: "chico",
        courier: "andreani",
        trackingCode: "TRACK123",
        totalCostUSD: 50,
        totalCostARS: 50000,
        date: "2024-01-15",
        status: "en_camino",
        notes: "Fragile",
        products: [{ id: "prod-1" }],
        storeId: "store-1",
        distributorId: "dist-1",
        orderItemIds: ["item-1", "item-2"],
      }
      const result = createBulkSchema.safeParse(bulk)
      expect(result.success).toBe(true)
    })
  })

  describe("updateBulkSchema", () => {
    it("should allow partial updates", () => {
      const result = updateBulkSchema.safeParse({ status: "entregado" })
      expect(result.success).toBe(true)
    })
  })
})

describe("Validators - Transaction", () => {
  describe("createTransactionSchema", () => {
    it("should validate a valid income transaction", () => {
      const transaction = {
        type: "income",
        concept: "Venta",
        amountUSD: 100,
      }
      const result = createTransactionSchema.safeParse(transaction)
      expect(result.success).toBe(true)
    })

    it("should validate a valid expense transaction", () => {
      const transaction = {
        type: "expense",
        concept: "Compra stock",
        amountUSD: 50,
      }
      const result = createTransactionSchema.safeParse(transaction)
      expect(result.success).toBe(true)
    })

    it("should require type", () => {
      const result = createTransactionSchema.safeParse({ concept: "Test", amountUSD: 10 })
      expect(result.success).toBe(false)
    })

    it("should validate type enum", () => {
      const transaction = { type: "invalid", concept: "Test", amountUSD: 10 }
      const result = createTransactionSchema.safeParse(transaction)
      expect(result.success).toBe(false)
    })

    it("should require positive amountUSD", () => {
      const transaction = { type: "income", concept: "Test", amountUSD: -10 }
      const result = createTransactionSchema.safeParse(transaction)
      expect(result.success).toBe(false)
    })

    it("should accept optional fields", () => {
      const transaction = {
        type: "income",
        concept: "Venta",
        amountUSD: 100,
        amountARS: 100000,
        date: "2024-01-15",
        notes: "Cash",
        orderId: "order-1",
      }
      const result = createTransactionSchema.safeParse(transaction)
      expect(result.success).toBe(true)
    })
  })

  describe("updateTransactionSchema", () => {
    it("should allow partial updates", () => {
      const result = updateTransactionSchema.safeParse({ amountUSD: 200 })
      expect(result.success).toBe(true)
    })
  })
})

describe("Validators - Store", () => {
  describe("createStoreSchema", () => {
    it("should validate a valid store", () => {
      const store = { name: "Tienda Central" }
      const result = createStoreSchema.safeParse(store)
      expect(result.success).toBe(true)
    })

    it("should require name", () => {
      const result = createStoreSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it("should accept optional fields", () => {
      const store = {
        name: "Tienda Central",
        contact: "Juan Perez",
        website: "https://tienda.com",
        notes: "Main store",
      }
      const result = createStoreSchema.safeParse(store)
      expect(result.success).toBe(true)
    })
  })

  describe("updateStoreSchema", () => {
    it("should allow partial updates", () => {
      const result = updateStoreSchema.safeParse({ contact: "New Contact" })
      expect(result.success).toBe(true)
    })
  })
})

describe("Validators - Setting", () => {
  describe("updateSettingSchema", () => {
    it("should validate a valid setting update", () => {
      const setting = { key: "exchange_rate", value: "1000" }
      const result = updateSettingSchema.safeParse(setting)
      expect(result.success).toBe(true)
    })

    it("should require key", () => {
      const result = updateSettingSchema.safeParse({ value: "1000" })
      expect(result.success).toBe(false)
    })

    it("should require value", () => {
      const result = updateSettingSchema.safeParse({ key: "exchange_rate" })
      expect(result.success).toBe(false)
    })
  })
})