import { z } from "zod"

export const createOrderSchema = z.object({
  clientName: z.string().min(1),
  clientSurname: z.string().optional(),
  clientPhone: z.string().optional(),
  clientEmail: z.string().optional(),
  clientContact: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
    priceUSD: z.number().optional().nullable(),
    color: z.string().optional(),
    storage: z.string().optional(),
  })),
  totalUSD: z.number().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
})

export const updateOrderSchema = z.object({
  status: z.string().optional(),
  notes: z.string().optional(),
  clientName: z.string().optional(),
  clientSurname: z.string().optional(),
  clientPhone: z.string().optional(),
  clientEmail: z.string().optional(),
  clientContact: z.string().optional(),
  paymentStatus: z.enum(["debe", "seña", "pagado"]).optional(),
  amountPaidUSD: z.number().min(0).optional(),
  amountPaidARS: z.number().min(0).optional(),
  finances: z.array(z.object({
    itemId: z.string(),
    costUSDT: z.number().min(0).optional(),
    shippingCost: z.number().min(0).optional(),
    logisticaUSDT: z.number().min(0).nullable().optional(),
    subtotalARS: z.number().min(0).nullable().optional(),
    profitARS: z.number().min(0).nullable().optional(),
    finalPriceARS: z.number().min(0).nullable().optional(),
    finalPriceUSD: z.number().min(0).nullable().optional(),
  })).optional(),
})

export const registerPaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(["USD", "ARS"]),
  concept: z.string().optional(),
})
