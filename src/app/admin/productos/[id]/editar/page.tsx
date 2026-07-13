"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Package } from "lucide-react"
import { ProductForm } from "@/components/admin/ProductForm"

export default function EditarProductoPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Record<string, unknown> | null>(null)
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
        setProduct(data.product)
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

  const specs = product.specs ? product.specs as Record<string, string> : undefined
  const images = product.images ? (product.images as string[]) : []

  const defaultValues = {
    name: product.name as string,
    slug: product.slug as string,
    description: (product.description as string) || "",
    costUSDT: product.costUSDT ? String(product.costUSDT) : "",
    yoniEnabled: (product.yoniEnabled as boolean) ?? false,
    yoniType: (product.yoniType as string) || "percentage",
    yoniValue: product.yoniValue ? String(product.yoniValue) : "25",
    hasFinancing: (product.hasFinancing as boolean) ?? false,
    shippingCost: product.shippingCost ? String(product.shippingCost) : "0",
    profitType: (product.profitType as string) || "percentage",
    profitValue: product.profitValue ? String(product.profitValue) : "0",
    stock: String(product.stock ?? "0"),
    minStock: String(product.minStock ?? "5"),
    isAvailable: product.isAvailable as boolean,
    isFeatured: product.isFeatured as boolean,
    categoryId: (product.categoryId as string) || "",
    storeId: (product.storeId as string) || "",
    images,
    specs,
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground font-heading">Editar producto</h1>
        <p className="text-muted-foreground text-sm mt-1">Modificá los datos del producto</p>
      </div>
      <ProductForm defaultValues={defaultValues} productSlug={product.slug as string} />
    </div>
  )
}
