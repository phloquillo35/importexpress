import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"

export const getHeroBanners = unstable_cache(
  async () => {
    const banners = await prisma.heroBanner.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    })
    const seen = new Set<string>()
    return banners.filter((b) => {
      const key = `${b.type}:${b.image}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  },
  ["hero"],
  { revalidate: 60, tags: ["hero"] }
)

export function cdnTransform(url: string, width: number) {
  if (!url?.includes("res.cloudinary.com")) return url
  return url.replace("/image/upload/", `/image/upload/f_auto,q_auto,w_${width}/`)
}
