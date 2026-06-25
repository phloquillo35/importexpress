"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Package, Ship, CreditCard, Star, AlertCircle } from "lucide-react"
import { ProductCard } from "@/components/public/ProductCard"
import { Skeleton } from "@/components/ui/skeleton"

interface Category {
  id: string
  name: string
  slug: string
  image: string | null
  _count: { products: number }
}

interface Product {
  id: string
  slug: string
  name: string
  priceUSD: number
  priceARS: number | null
  images: string[]
  stock: number
  isFeatured: boolean
  category: { name: string; slug: string } | null
}

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [featured, setFeatured] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      setError(false)
      try {
        const [catRes, prodRes] = await Promise.all([
          fetch("/api/categorias"),
          fetch("/api/productos?destacados=true&limit=8"),
        ])
        if (!catRes.ok || !prodRes.ok) throw new Error("Error al cargar datos")
        const cats = await catRes.json()
        const prods = await prodRes.json()
        setCategories(Array.isArray(cats) ? cats : [])
        setFeatured(prods.products || [])
      } catch (e) {
        console.error(e)
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div>
      <section className="bg-white py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f5f5f7] border border-[#d2d2d7]/50 text-[#0071e3] text-xs font-medium mb-6">
            <Star className="w-3 h-3" />
            Importación directa sin intermediarios
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1d1d1f] font-heading leading-tight mb-4">
            Todo lo que necesitás,{" "}
            <span className="text-[#0071e3]">
              importado para vos
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-[#6e6e73] mb-10 max-w-2xl mx-auto leading-relaxed">
            Importamos productos de alta calidad desde Punta del Este directo a tu casa. 
            Electrónica, hogar, moda y más, con los mejores precios del mercado.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 px-7 py-3 bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-medium rounded-full transition-all duration-300"
            >
              Explorar productos
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/como-funciona"
              className="inline-flex items-center gap-2 px-7 py-3 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#0071e3] text-sm font-medium rounded-full transition-all duration-300"
            >
              Cómo funciona
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1d1d1f] font-heading">Productos Destacados</h2>
              <p className="text-[#6e6e73] mt-1.5">Lo más elegido por nuestros clientes</p>
            </div>
            <Link href="/productos" className="hidden sm:inline-flex items-center gap-1 text-sm text-[#0071e3] hover:text-[#0077ed] transition-colors font-medium">
              Ver todos
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
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
            <div className="flex flex-col items-center justify-center py-12 text-[#6e6e73]">
              <AlertCircle className="w-12 h-12 mb-3 text-[#ff3b30]" />
              <p className="text-sm">Error al cargar productos</p>
            </div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="text-center text-[#6e6e73] py-12">No hay productos destacados aún</p>
          )}

          <div className="sm:hidden mt-6 text-center">
            <Link href="/productos" className="inline-flex items-center gap-1 text-sm text-[#0071e3] hover:text-[#0077ed] transition-colors font-medium">
              Ver todos
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#f5f5f7] py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1d1d1f] font-heading">Categorías</h2>
              <p className="text-[#6e6e73] mt-1.5">Explorá por categoría</p>
            </div>
            <Link href="/productos" className="hidden sm:inline-flex items-center gap-1 text-sm text-[#0071e3] hover:text-[#0077ed] transition-colors font-medium">
              Ver todo
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-2xl bg-white" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#6e6e73]">
              <AlertCircle className="w-12 h-12 mb-3 text-[#ff3b30]" />
              <p className="text-sm">Error al cargar categorías</p>
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categorias/${cat.slug}`}
                  className="group flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-2xl border border-[#d2d2d7]/60 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:scale-[1.02] transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#f5f5f7] flex items-center justify-center group-hover:bg-[#e8e8ed] transition-colors">
                    <Package className="w-6 h-6 text-[#0071e3]" />
                  </div>
                  <span className="text-sm font-medium text-[#1d1d1f] text-center">
                    {cat.name}
                  </span>
                  <span className="text-xs text-[#6e6e73]">{cat._count.products} productos</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-[#6e6e73] py-12">No hay categorías disponibles</p>
          )}

          <div className="sm:hidden mt-6 text-center">
            <Link href="/productos" className="inline-flex items-center gap-1 text-sm text-[#0071e3] hover:text-[#0077ed] transition-colors font-medium">
              Ver todo
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#f5f5f7] py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1d1d1f] font-heading mb-3">¿Cómo funciona?</h2>
            <p className="text-[#6e6e73] max-w-xl mx-auto">
              Tres pasos simples para recibir tus productos importados
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="text-center p-8 bg-white rounded-2xl border border-[#d2d2d7]/60 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-[#f5f5f7] flex items-center justify-center mx-auto mb-5">
                <Package className="w-7 h-7 text-[#0071e3]" />
              </div>
              <div className="w-8 h-8 rounded-full bg-[#0071e3] text-white text-sm font-bold flex items-center justify-center mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-[#1d1d1f] font-heading mb-2">Elegí tus productos</h3>
              <p className="text-sm text-[#6e6e73] leading-relaxed">
                Navegá por nuestro catálogo y seleccioná los productos que querés importar.
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-2xl border border-[#d2d2d7]/60 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-[#f5f5f7] flex items-center justify-center mx-auto mb-5">
                <Ship className="w-7 h-7 text-[#0071e3]" />
              </div>
              <div className="w-8 h-8 rounded-full bg-[#0071e3] text-white text-sm font-bold flex items-center justify-center mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-[#1d1d1f] font-heading mb-2">Nos encargamos de todo</h3>
              <p className="text-sm text-[#6e6e73] leading-relaxed">
                Gestionamos la importación desde Punta del Este, trámites aduaneros y logística hasta tu puerta.
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-2xl border border-[#d2d2d7]/60 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-[#f5f5f7] flex items-center justify-center mx-auto mb-5">
                <CreditCard className="w-7 h-7 text-[#0071e3]" />
              </div>
              <div className="w-8 h-8 rounded-full bg-[#0071e3] text-white text-sm font-bold flex items-center justify-center mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-[#1d1d1f] font-heading mb-2">Recibí en tu casa</h3>
              <p className="text-sm text-[#6e6e73] leading-relaxed">
                Te entregamos los productos directamente en tu domicilio. Rápido y seguro.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
