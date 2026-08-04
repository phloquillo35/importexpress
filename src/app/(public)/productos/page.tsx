import { ProductosContent } from "@/components/public/ProductosContent"
import { getCategories } from "@/lib/categories"

export const dynamic = "force-dynamic"

export default async function ProductosPage() {
  const categories = await getCategories().catch(() => [])
  return <ProductosContent initialCategories={categories} />
}
