import { z } from "zod"

export const createProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  specs: z.any().optional(),
  images: z.array(z.union([z.string(), z.object({ url: z.string(), color: z.string() })])).optional(),
  priceUSD: z.number().optional(),
  priceARS: z.number().optional(),
  costUSD: z.number().optional(),
  costUSDT: z.number(),
  yoniEnabled: z.boolean().optional().default(false),
  yoniType: z.enum(["percentage", "fixed_usdt", "fixed_ars"]).optional().default("percentage"),
  yoniValue: z.number().optional().default(25),
  hasFinancing: z.boolean().optional().default(false),
  shippingCost: z.number().optional().default(0),
  profitType: z.enum(["percentage", "fixed_usdt", "fixed_ars"]).optional().default("percentage"),
  profitValue: z.number().optional().default(0),
  stock: z.number().int().optional().default(0),
  minStock: z.number().int().optional().default(0),
  isAvailable: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  categoryId: z.string().optional().nullable(),
  storeId: z.string().optional().nullable(),
  finalPriceUSD: z.number().optional(),
  finalPriceARS: z.number().optional(),
  exchangeRate: z.number().optional(),
})

export const updateProductSchema = createProductSchema.partial()
