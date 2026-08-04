import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"

export const getHeroBanners = unstable_cache(
  async () =>
    prisma.heroBanner.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    }),
  ["hero"],
  { revalidate: 60, tags: ["hero"] }
)

export function cdnTransform(url: string, width: number) {
  if (!url?.includes("res.cloudinary.com")) return url
  return url.replace("/image/upload/", `/image/upload/f_auto,q_auto,w_${width}/`)
}
