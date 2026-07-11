import { z } from "zod"

export const createBulkSchema = z.object({
  type: z.enum(["grande", "chico"]).optional(),
  courier: z.enum(["buspack", "correo_argentino"]).optional(),
  trackingCode: z.string().optional().nullable(),
  totalCostUSD: z.number().optional().nullable(),
  totalCostARS: z.number().optional().nullable(),
  date: z.string().optional(),
  status: z.enum(["pending", "en_camino", "demorado", "llego", "entregado", "cancelado"]).optional(),
  notes: z.string().optional().nullable(),
  products: z.any().optional(),
  distributorId: z.string().optional().nullable(),
  orderItemIds: z.array(z.string()).optional(),
})

export const updateBulkSchema = createBulkSchema.partial()
