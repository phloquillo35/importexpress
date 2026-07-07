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
  parent: { id: string; name: string; slug: string } | null
  children: { id: string; name: string; slug: string }[]
}

interface Product {
  id: string
  slug: string
  name: string
  priceUSD: number
  priceARS: number | null
  finalPriceARS: number
  images: string[]
  stock: number
  isAvailable: boolean
  hasFinancing: boolean
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 bg-card">
        <div className="space-y-6">
          <Skeleton className="h-6 w-32 bg-muted" />
          <Skeleton className="h-8 w-64 bg-muted" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border/60 overflow-hidden">
                <Skeleton className="aspect-[4/3] !rounded-none bg-muted" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-3 w-16 bg-muted" />
                  <Skeleton className="h-4 w-3/4 bg-muted" />
                  <Skeleton className="h-5 w-20 bg-muted" />
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center bg-card">
        <AlertCircle className="w-16 h-16 text-[#ff3b30] mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground font-heading mb-2">Error al cargar la categoría</h1>
        <p className="text-muted-foreground mb-6">No pudimos cargar la información. Intentá de nuevo más tarde.</p>
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 text-primary hover:text-[#0077ed] transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Ver todos los productos
        </Link>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center bg-card">
        <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground font-heading mb-2">Categoría no encontrada</h1>
        <p className="text-muted-foreground mb-6">La categoría que buscás no existe</p>
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 text-primary hover:text-[#0077ed] transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Ver todos los productos
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
          <Link
            href="/productos"
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-primary mb-4 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Todos los productos
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-white font-heading">
            {category?.name || slug}
          </h1>
          {category?.description && (
            <p className="text-white/70 mt-2 max-w-xl">{category.description}</p>
          )}
          <p className="text-sm text-white/70 mt-2">{products.length} productos</p>
          {category?.children && category.children.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {category.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/categorias/${child.slug}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-full transition-colors"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          )}
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
          <div className="flex flex-col items-center justify-center py-20 text-white/70">
            <Package className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium text-white mb-1">No hay productos en esta categoría</p>
            {category?.children && category.children.length > 0 && (
              <div className="mt-4 text-center">
                <p className="text-sm text-white/70 mb-3">Explorá sus subcategorías:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {category.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/categorias/${child.slug}`}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-full transition-colors"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
