import { z } from "zod"

export const createOrderSchema = z.object({
  clientName: z.string().min(1),
  clientSurname: z.string().optional(),
  clientPhone: z.string().optional(),
  clientEmail: z.string().optional(),
  storeName: z.string().optional(),
  clientContact: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
    priceUSD: z.number().optional().nullable(),
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
  storeName: z.string().optional(),
  clientContact: z.string().optional(),
  paymentStatus: z.enum(["pending", "deposit", "paid"]).optional(),
  amountPaidUSD: z.number().min(0).optional(),
})
