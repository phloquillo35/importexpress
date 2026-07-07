import { z } from "zod"

export const createStoreSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
})

export const updateStoreSchema = createStoreSchema.partial()
