"use client"

import { useEffect, useState, useMemo, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, ChevronDown, Package, AlertCircle, ArrowRight } from "lucide-react"
import { ProductCard } from "@/components/public/ProductCard"
import { Skeleton } from "@/components/ui/skeleton"

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
  category: { name: string; slug: string; parent: { name: string; slug: string } | null } | null
}

interface Category {
  id: string
  name: string
  slug: string
  parent: { id: string; name: string; slug: string } | null
  _count: { products: number }
  children: { id: string; name: string; slug: string; _count: { products: number } }[]
}

function getProductColors(images: unknown): string[] {
  if (!images || !Array.isArray(images) || images.length === 0) return []
  if (typeof images[0] === "string") return []
  const colors = [...new Set(images.map((img: unknown) => (img as { color?: string }).color).filter(Boolean))] as string[]
  return colors
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
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())

  const paramsKey = searchParams.toString()
  const currentPage = parseInt(searchParams.get("page") || "1")

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(false)
      try {
        const sp = new URLSearchParams(paramsKey)
        const apiParams = new URLSearchParams()
        const s = sp.get("search") || ""
        const c = sp.get("categoria") || ""
        const p = parseInt(sp.get("page") || "1")
        if (s) apiParams.set("search", s)
        if (c) apiParams.set("categoria", c)
        apiParams.set("page", String(p))

        const res = await fetch(`/api/productos?${apiParams}`)
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
    }
    load()
  }, [paramsKey])

  useEffect(() => {
    fetch("/api/categorias")
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  function toggleParent(id: string) {
    setExpandedParents(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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

  const colorVariants = useMemo(() => {
    const variants: Array<{ product: Product; colorName: string | null }> = []
    for (const product of products) {
      const colors = getProductColors(product.images)
      if (colors.length > 1) {
        for (const color of colors) {
          variants.push({ product, colorName: color })
        }
      } else {
        variants.push({ product, colorName: null })
      }
    }
    return variants
  }, [products])
  const displayTotal = colorVariants.length

  return (
    <div>
      <div className="border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground font-heading mb-2">Catálogo</h1>
          <p className="text-foreground/70 dark:text-muted-foreground">{displayTotal} productos disponibles</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <form onSubmit={handleSearch} className="flex-1 flex">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar productos..."
                className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border/60 rounded-full text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] text-sm transition-all"
              />
            </div>
            <button
              type="submit"
              className="ml-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-full transition-colors"
            >
              Buscar
            </button>
          </form>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden p-2.5 bg-muted border border-border/60 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-8">
          <aside className={`${showFilters ? "block" : "hidden"} lg:block w-full lg:w-56 flex-shrink-0`}>
            <div className="bg-card rounded-2xl border border-border/60 p-5 sticky top-24">
              <h3 className="text-sm font-semibold text-foreground font-heading mb-4">Categorías</h3>
              <div className="space-y-1">
                <button
                  onClick={() => { updateParams({ categoria: undefined }); setShowFilters(false) }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    !searchParams.get("categoria")
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  Todas las categorías
                </button>
                {categories.filter(c => !c.parent).map((parent) => {
                  const children = categories.filter(c => c.parent?.id === parent.id)
                  const isExpanded = expandedParents.has(parent.id)
                  return (
                    <div key={parent.id}>
                      <div className="flex items-center gap-0">
                        {children.length > 0 && (
                          <button
                            onClick={() => toggleParent(parent.id)}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                          >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button
                          onClick={() => { updateParams({ categoria: parent.slug }); setShowFilters(false) }}
                          className={`flex-1 text-left px-2 py-2 rounded-lg text-sm transition-colors ${
                            searchParams.get("categoria") === parent.slug
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          {parent.name}
                          <span className="text-xs text-muted-foreground ml-2">({parent._count.products + parent.children.reduce((s, c) => s + c._count.products, 0)})</span>
                        </button>
                      </div>
                      {isExpanded && children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => { updateParams({ categoria: child.slug }); setShowFilters(false) }}
                          className={`w-full text-left pl-8 pr-3 py-1.5 rounded-lg text-sm transition-colors ${
                            searchParams.get("categoria") === child.slug
                              ? "bg-primary/5 text-primary font-medium"
                              : "text-muted-foreground/70 hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          {child.name}
                          <span className="text-xs text-muted-foreground ml-2">({child._count.products})</span>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
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
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <AlertCircle className="w-16 h-16 mb-4 text-[#ff3b30]" />
                <p className="text-lg font-medium text-foreground mb-1">Error al cargar productos</p>
                <p className="text-sm">Intentá de nuevo más tarde</p>
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {colorVariants.map(({ product, colorName }) => (
                    <ProductCard key={colorName ? `${product.id}-${colorName}` : product.id} product={product} colorName={colorName} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button
                      onClick={() => updateParams({ page: String(currentPage - 1) })}
                      disabled={currentPage <= 1}
                      className="p-2 bg-card border border-border/60 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                      .map((p, idx, arr) => (
                        <span key={p} className="contents">
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span className="text-muted-foreground px-1">...</span>
                          )}
                          <button
                            onClick={() => updateParams({ page: String(p) })}
                            className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                              p === currentPage
                                ? "bg-[#0071e3] text-white"
                                : "bg-card border border-border/60 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {p}
                          </button>
                        </span>
                      ))}

                    <button
                      onClick={() => updateParams({ page: String(currentPage + 1) })}
                      disabled={currentPage >= totalPages}
                      className="p-2 bg-card border border-border/60 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Package className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium text-foreground mb-1">No se encontraron productos</p>
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
          <Skeleton className="h-8 w-64 bg-muted" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
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
    }>
      <ProductosContent />
    </Suspense>
  )
}
