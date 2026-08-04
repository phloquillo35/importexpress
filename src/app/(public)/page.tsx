import { HomeContent } from "@/components/public/HomeContent"
import { getCategories } from "@/lib/categories"
import { getHeroBanners, cdnTransform } from "@/lib/hero"

export default async function HomePage() {
  const [categories, heroBanners] = await Promise.all([
    getCategories().catch(() => []),
    getHeroBanners().catch(() => []),
  ])

  const initialHero = {
    carousel: heroBanners
      .filter((b) => b.type === "carousel")
      .map((b) => ({ ...b, image: cdnTransform(b.image, 1600) })),
    flyers: heroBanners
      .filter((b) => b.type === "flyer")
      .map((b) => ({ ...b, image: cdnTransform(b.image, 800) })),
  }

  return <HomeContent initialCategories={categories} initialHero={initialHero} />
}
