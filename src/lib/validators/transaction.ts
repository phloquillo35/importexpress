import { z } from "zod"

export const createTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  concept: z.string().min(1),
  amountUSD: z.number().positive(),
  amountARS: z.number().optional(),
  date: z.string().optional(),
  notes: z.string().optional(),
})

export const updateTransactionSchema = createTransactionSchema.partial()
