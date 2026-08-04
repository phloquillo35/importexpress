import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"

export const getCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { products: true } },
        children: { select: { id: true, name: true, slug: true, _count: { select: { products: true } } } },
        parent: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { name: "asc" },
    }),
  ["categorias"],
  { revalidate: 60, tags: ["categorias"] }
)
