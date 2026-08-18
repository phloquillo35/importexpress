"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Package, Ship, CreditCard, AlertCircle } from "lucide-react"
import { ProductCard } from "@/components/public/ProductCard"
import { Skeleton } from "@/components/ui/skeleton"
import { HeroSection } from "@/components/public/HeroSection"

interface Category {
  id: string
  name: string
  slug: string
  image: string | null
  parent: { id: string; name: string; slug: string } | null
  _count: { products: number }
  children: { id: string; name: string; slug: string; _count: { products: number } }[]
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
  isFeatured: boolean
  hasFinancing: boolean
  freeShipping: boolean
  category: { name: string; slug: string; parent: { name: string; slug: string } | null } | null
}

interface HeroBanner {
  id: string
  type: string
  position: string
  image: string
  link: string | null
}

interface InitialHero {
  carousel: HeroBanner[]
  flyers: HeroBanner[]
}

export function HomeContent({ initialCategories = [], initialHero }: { initialCategories?: Category[]; initialHero?: InitialHero }) {
  const [featured, setFeatured] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  async function loadFeatured(newOffset = 0, append = false) {
    setError(false)
    try {
      const prodRes = await fetch(`/api/productos?destacados=true&limit=12&offset=${newOffset}`)
      if (!prodRes.ok) throw new Error("Error al cargar datos")
      const prods = await prodRes.json()
      const products = prods.products || []
      if (append) {
        setFeatured(prev => [...prev, ...products])
        setOffset(offset + products.length)
      } else {
        setFeatured(products)
        setOffset(products.length)
      }
      setHasMore(products.length === 12)
    } catch (e) {
      console.error(e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function loadInitial() {
      await loadFeatured(0, false)
      if (!cancelled) {
        // Initial load complete
      }
    }
    loadInitial()
    return () => { cancelled = true }
  }, [])

  const categories = initialCategories

  return (
    <div>
      <HeroSection initialCategories={initialCategories} initialHero={initialHero} />

      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-start sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground font-heading whitespace-nowrap">Productos Destacados</h2>
              <p className="text-foreground/70 dark:text-muted-foreground mt-1.5">Lo más elegido por nuestros clientes</p>
            </div>
            <button
              onClick={() => window.location.href = "/productos"}
              className="block sm:inline-flex items-center gap-1 text-sm text-primary hover:text-[#0077ed] transition-colors font-medium"
            >
              Ver todos los productos
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-card rounded-2xl border border-border/60 overflow-hidden">
                  <Skeleton className="aspect-square sm:aspect-[4/3] !rounded-none bg-muted" />
                  <div className="p-5 space-y-3">
                    <Skeleton className="h-3 w-16 bg-muted" />
                    <Skeleton className="h-4 w-3/4 bg-muted" />
                    <Skeleton className="h-5 w-20 bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-foreground/70 dark:text-muted-foreground">
              <AlertCircle className="w-12 h-12 mb-3 text-[#ff3b30]" />
              <p className="text-sm">Error al cargar productos</p>
            </div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="text-center text-foreground/70 dark:text-muted-foreground py-12">No hay productos destacados aún</p>
          )}

          {(hasMore || offset < 12) && featured.length > 0 && (
            <div className="mt-8 text-center">
              <button
                onClick={() => loadFeatured(offset, true)}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Cargando...
                  </>
                ) : (
                  <>
                    Ver más
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      <section id="categorias" className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground font-heading">Categorías</h2>
              <p className="text-foreground/70 dark:text-muted-foreground mt-1.5">Explorá por categoría</p>
            </div>
            <button
              onClick={() => window.location.href = "/productos"}
              className="hidden sm:inline-flex items-center gap-1 text-sm text-primary hover:text-[#0077ed] transition-colors font-medium"
            >
              Ver todos los productos
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-2xl bg-card" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-foreground/70 dark:text-muted-foreground">
              <AlertCircle className="w-12 h-12 mb-3 text-[#ff3b30]" />
              <p className="text-sm">Error al cargar categorías</p>
            </div>
          ) : categories.filter(c => !c.parent).length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.filter(c => !c.parent).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categorias/${cat.slug}`}
                  className="group flex flex-col items-center justify-center gap-3 p-6 bg-card rounded-2xl border border-border/60 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:scale-[1.02] transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-[#e8e8ed] transition-colors overflow-hidden">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground text-center">
                    {cat.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{cat._count.products + cat.children.reduce((s, c) => s + c._count.products, 0)} productos</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-foreground/70 dark:text-muted-foreground py-12">No hay categorías disponibles</p>
          )}
          {categories.some(c => c.parent) && (
            <div className="mt-4 text-center">
              <Link href="/productos" className="text-sm text-primary hover:text-[#0077ed] transition-colors font-medium">
                Ver subcategorías disponibles
              </Link>
            </div>
          )}

          <div className="sm:hidden mt-6 text-center">
            <Link href="/productos" className="inline-flex items-center gap-1 text-sm text-primary hover:text-[#0077ed] transition-colors font-medium">
              Ver todo
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground font-heading mb-3">¿Cómo funciona?</h2>
            <p className="text-foreground/70 dark:text-muted-foreground max-w-xl mx-auto">
              Tres pasos simples para recibir tus productos importados
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="text-center p-8 bg-card rounded-2xl border border-border/60 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-5">
                <Package className="w-7 h-7 text-primary" />
              </div>
              <div className="w-8 h-8 rounded-full bg-[#0071e3] text-white text-sm font-bold flex items-center justify-center mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-foreground font-heading mb-2">Elegí tus productos</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Navegá por nuestro catálogo y seleccioná los productos que querés importar.
              </p>
            </div>

            <div className="text-center p-8 bg-card rounded-2xl border border-border/60 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-5">
                <Ship className="w-7 h-7 text-primary" />
              </div>
              <div className="w-8 h-8 rounded-full bg-[#0071e3] text-white text-sm font-bold flex items-center justify-center mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-foreground font-heading mb-2">Nos encargamos de todo</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Gestionamos la importación desde Ciudad del Este, Paraguay, trámites aduaneros y logística hasta tu puerta.
              </p>
            </div>

            <div className="text-center p-8 bg-card rounded-2xl border border-border/60 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-5">
                <CreditCard className="w-7 h-7 text-primary" />
              </div>
              <div className="w-8 h-8 rounded-full bg-[#0071e3] text-white text-sm font-bold flex items-center justify-center mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-foreground font-heading mb-2">Recibí en tu casa</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Te entregamos los productos directamente en tu domicilio. Rápido y seguro.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
