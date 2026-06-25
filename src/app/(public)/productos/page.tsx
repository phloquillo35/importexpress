"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, Package, AlertCircle, ArrowRight } from "lucide-react"
import { ProductCard } from "@/components/public/ProductCard"
import { Skeleton } from "@/components/ui/skeleton"

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

interface Category {
  id: string
  name: string
  slug: string
  _count: { products: number }
}

function ProductosContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [showFilters, setShowFilters] = useState(false)

  const currentPage = parseInt(searchParams.get("page") || "1")
  const currentCategory = searchParams.get("categoria") || ""
  const currentSearch = searchParams.get("search") || ""

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const params = new URLSearchParams()
      if (currentSearch) params.set("search", currentSearch)
      if (currentCategory) params.set("categoria", currentCategory)
      params.set("page", String(currentPage))

      const res = await fetch(`/api/productos?${params}`)
      if (!res.ok) throw new Error("Error al cargar productos")
      const data = await res.json()
      setProducts(data.products || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 0)
    } catch (e) {
      console.error(e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [currentSearch, currentCategory, currentPage])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    fetch("/api/categorias")
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })
    if (updates.categoria !== undefined || updates.search !== undefined) {
      params.set("page", "1")
    }
    router.push(`/productos?${params.toString()}`)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateParams({ search, categoria: undefined })
  }

  return (
    <div>
      <div className="border-b border-[#d2d2d7]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-heading mb-2">Catálogo</h1>
          <p className="text-white/70">{total} productos disponibles</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <form onSubmit={handleSearch} className="flex-1 flex">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6e73]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar productos..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7]/60 rounded-full text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] text-sm transition-all"
              />
            </div>
            <button
              type="submit"
              className="ml-2 px-5 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-medium rounded-full transition-colors"
            >
              Buscar
            </button>
          </form>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden p-2.5 bg-[#f5f5f7] border border-[#d2d2d7]/60 rounded-full text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-8">
          <aside className={`${showFilters ? "block" : "hidden"} lg:block w-full lg:w-56 flex-shrink-0`}>
            <div className="bg-white rounded-2xl border border-[#d2d2d7]/60 p-5 sticky top-24">
              <h3 className="text-sm font-semibold text-[#1d1d1f] font-heading mb-4">Categorías</h3>
              <div className="space-y-1">
                <button
                  onClick={() => updateParams({ categoria: undefined })}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    !currentCategory
                      ? "bg-[#0071e3]/10 text-[#0071e3] font-medium"
                      : "text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]"
                  }`}
                >
                  Todas las categorías
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => updateParams({ categoria: cat.slug })}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      currentCategory === cat.slug
                        ? "bg-[#0071e3]/10 text-[#0071e3] font-medium"
                        : "text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]"
                    }`}
                  >
                    {cat.name}
                    <span className="text-xs text-[#6e6e73] ml-2">({cat._count.products})</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-[#d2d2d7]/60 overflow-hidden">
                    <Skeleton className="aspect-[4/3] !rounded-none bg-[#f5f5f7]" />
                    <div className="p-5 space-y-3">
                      <Skeleton className="h-3 w-16 bg-[#f5f5f7]" />
                      <Skeleton className="h-4 w-3/4 bg-[#f5f5f7]" />
                      <Skeleton className="h-5 w-20 bg-[#f5f5f7]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#6e6e73]">
                <AlertCircle className="w-16 h-16 mb-4 text-[#ff3b30]" />
                <p className="text-lg font-medium text-[#1d1d1f] mb-1">Error al cargar productos</p>
                <p className="text-sm">Intentá de nuevo más tarde</p>
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button
                      onClick={() => updateParams({ page: String(currentPage - 1) })}
                      disabled={currentPage <= 1}
                      className="p-2 bg-white border border-[#d2d2d7]/60 rounded-full text-[#6e6e73] hover:text-[#1d1d1f] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                      .map((p, idx, arr) => (
                        <span key={p} className="contents">
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span className="text-[#6e6e73] px-1">...</span>
                          )}
                          <button
                            onClick={() => updateParams({ page: String(p) })}
                            className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                              p === currentPage
                                ? "bg-[#0071e3] text-white"
                                : "bg-white border border-[#d2d2d7]/60 text-[#6e6e73] hover:text-[#1d1d1f]"
                            }`}
                          >
                            {p}
                          </button>
                        </span>
                      ))}

                    <button
                      onClick={() => updateParams({ page: String(currentPage + 1) })}
                      disabled={currentPage >= totalPages}
                      className="p-2 bg-white border border-[#d2d2d7]/60 rounded-full text-[#6e6e73] hover:text-[#1d1d1f] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-[#6e6e73]">
                <Package className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium text-[#1d1d1f] mb-1">No se encontraron productos</p>
                <p className="text-sm">Intentá con otros términos de búsqueda</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProductosPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64 bg-[#f5f5f7]" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#d2d2d7]/60 overflow-hidden">
                <Skeleton className="aspect-[4/3] !rounded-none bg-[#f5f5f7]" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-3 w-16 bg-[#f5f5f7]" />
                  <Skeleton className="h-4 w-3/4 bg-[#f5f5f7]" />
                  <Skeleton className="h-5 w-20 bg-[#f5f5f7]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    }>
      <ProductosContent />
    </Suspense>
  )
}
