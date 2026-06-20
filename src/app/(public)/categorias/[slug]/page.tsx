"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Package, ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"
import { ProductCard } from "@/components/public/ProductCard"
import { Skeleton } from "@/components/ui/skeleton"

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
}

interface Product {
  id: string
  slug: string
  name: string
  priceUSD: number
  priceARS: number | null
  images: string[]
  stock: number
  category: { name: string; slug: string } | null
}

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const [category, setCategory] = useState<Category | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(false)
      try {
        const res = await fetch(`/api/productos?categoria=${slug}&limit=50`)
        if (!res.ok) throw new Error("Error al cargar productos")
        const data = await res.json()

        const catRes = await fetch("/api/categorias")
        const cats = await catRes.json()
        const found = Array.isArray(cats) ? cats.find((c: Category) => c.slug === slug) : null

        if (!found && data.products?.length === 0) {
          setNotFound(true)
          return
        }

        setCategory(found || null)
        setProducts(data.products || [])
      } catch (e) {
        console.error(e)
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="space-y-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <Skeleton className="aspect-[4/3] !rounded-none" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white font-heading mb-2">Error al cargar la categoría</h1>
        <p className="text-zinc-400 mb-6">No pudimos cargar la información. Intentá de nuevo más tarde.</p>
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 text-[#F59E0B] hover:text-[#D97706] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Ver todos los productos
        </Link>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white font-heading mb-2">Categoría no encontrada</h1>
        <p className="text-zinc-400 mb-6">La categoría que buscás no existe</p>
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 text-[#F59E0B] hover:text-[#D97706] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Ver todos los productos
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-gradient-to-r from-[#F59E0B]/10 via-transparent to-[#8B5CF6]/10 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <Link
            href="/productos"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Todos los productos
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-white font-heading">
            {category?.name || slug}
          </h1>
          {category?.description && (
            <p className="text-zinc-400 mt-2 max-w-xl">{category.description}</p>
          )}
          <p className="text-sm text-zinc-500 mt-2">{products.length} productos</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <Package className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium text-zinc-400 mb-1">No hay productos en esta categoría</p>
          </div>
        )}
      </div>
    </div>
  )
}
