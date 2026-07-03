import { z } from "zod"

export const createCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().optional().nullable(),
  subcategories: z.array(z.string()).optional(),
})

export const updateCategorySchema = createCategorySchema.partial()
