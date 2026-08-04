import { CategoryContent } from "@/components/public/CategoryContent"
import { getCategories } from "@/lib/categories"

export const dynamic = "force-dynamic"

export default async function CategoryPage() {
  const categories = await getCategories().catch(() => [])
  return <CategoryContent initialCategories={categories} />
}
