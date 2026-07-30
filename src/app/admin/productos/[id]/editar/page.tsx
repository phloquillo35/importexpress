"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Package } from "lucide-react"
import { ProductForm } from "@/components/admin/ProductForm"

interface ProductData {
  name: string
  slug: string
  description: string | null
  costUSDT: number | null
  yoniEnabled: boolean
  yoniType: string
  yoniValue: number
  hasFinancing: boolean
  shippingCost: number | null
  profitType: string
  profitValue: number
  stock: number
  minStock: number
  isAvailable: boolean
  isFeatured: boolean
  freeShipping: boolean
  categoryId: string | null
  storeId: string | null
  images: string[] | { url: string; color: string }[]
  specs: Record<string, string> | null
}

export default function EditarProductoPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<ProductData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/productos/${id}`)
        if (res.status === 404) {
          setNotFound(true)
          return
        }
        const data = await res.json()
        setProduct(data.product as ProductData)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-6 h-6 border-2 border-[#22C55E] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (notFound || !product) {
    return (
      <div className="text-center py-20">
        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Producto no encontrado</p>
      </div>
    )
  }

  const specs = product.specs ?? undefined
  const images = Array.isArray(product.images) ? product.images : []

  const defaultValues = {
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    costUSDT: product.costUSDT ? String(product.costUSDT) : "",
    yoniEnabled: product.yoniEnabled,
    yoniType: product.yoniType || "percentage",
    yoniValue: product.yoniValue ? String(product.yoniValue) : "25",
    hasFinancing: product.hasFinancing,
    shippingCost: product.shippingCost ? String(product.shippingCost) : "0",
    profitType: product.profitType || "percentage",
    profitValue: product.profitValue ? String(product.profitValue) : "0",
    stock: String(product.stock ?? "0"),
    minStock: String(product.minStock ?? "5"),
    isAvailable: product.isAvailable,
    isFeatured: product.isFeatured,
    freeShipping: product.freeShipping,
    categoryId: product.categoryId ?? "",
    storeId: product.storeId ?? "",
    images,
    specs,
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground font-heading">Editar producto</h1>
        <p className="text-muted-foreground text-sm mt-1">Modificá los datos del producto</p>
      </div>
      <ProductForm defaultValues={defaultValues} productSlug={product.slug} />
    </div>
  )
}
