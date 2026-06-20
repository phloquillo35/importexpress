"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Search, Package, Ship, CreditCard, Star, AlertCircle } from "lucide-react"
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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F59E0B]/5 via-transparent to-[#8B5CF6]/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-32 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] text-sm font-medium mb-6">
              <Star className="w-4 h-4" />
              Importación directa sin intermediarios
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white font-heading leading-tight mb-6">
              Todo lo que necesitás,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F59E0B] to-[#8B5CF6]">
                importado para vos
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
              Importamos productos de alta calidad desde Punta del Este directo a tu casa. 
              Electrónica, hogar, moda y más, con los mejores precios del mercado.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/productos"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-[#F59E0B]/20"
              >
                <Search className="w-5 h-5" />
                Explorar productos
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/como-funciona"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all duration-300"
              >
                Cómo funciona
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-heading">Categorías</h2>
            <p className="text-zinc-400 mt-1">Explorá por categoría</p>
          </div>
          <Link href="/productos" className="text-sm text-[#F59E0B] hover:text-[#D97706] transition-colors">
            Ver todo →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <AlertCircle className="w-12 h-12 mb-3 text-red-400" />
            <p className="text-sm">Error al cargar categorías</p>
          </div>
        ) : categories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/categorias/${cat.slug}`}
                className="group flex flex-col items-center justify-center gap-3 p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-[#F59E0B]/5 hover:border-[#F59E0B]/20 hover:scale-[1.02] transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center group-hover:bg-[#F59E0B]/20 transition-colors">
                  <Package className="w-6 h-6 text-[#F59E0B]" />
                </div>
                <span className="text-sm font-medium text-zinc-300 group-hover:text-white text-center transition-colors">
                  {cat.name}
                </span>
                <span className="text-xs text-zinc-500">{cat._count.products} productos</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-zinc-500 py-12">No hay categorías disponibles</p>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-heading">Productos Destacados</h2>
            <p className="text-zinc-400 mt-1">Lo más elegido por nuestros clientes</p>
          </div>
          <Link href="/productos" className="text-sm text-[#F59E0B] hover:text-[#D97706] transition-colors">
            Ver todos →
          </Link>
        </div>

        {loading ? (
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
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <AlertCircle className="w-12 h-12 mb-3 text-red-400" />
            <p className="text-sm">Error al cargar productos</p>
          </div>
        ) : featured.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-center text-zinc-500 py-12">No hay productos destacados aún</p>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-heading mb-3">¿Cómo funciona?</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Tres pasos simples para recibir tus productos importados
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-8 bg-white/5 border border-white/10 rounded-2xl hover:border-[#F59E0B]/20 transition-colors group">
            <div className="w-14 h-14 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-[#F59E0B]/20 transition-colors">
              <Search className="w-7 h-7 text-[#F59E0B]" />
            </div>
            <div className="w-8 h-8 rounded-full bg-[#F59E0B] text-white text-sm font-bold flex items-center justify-center mx-auto mb-4">
              1
            </div>
            <h3 className="text-lg font-semibold text-white font-heading mb-2">Elegí tus productos</h3>
            <p className="text-sm text-zinc-400">
              Navegá por nuestro catálogo y seleccioná los productos que querés importar.
            </p>
          </div>

          <div className="text-center p-8 bg-white/5 border border-white/10 rounded-2xl hover:border-[#8B5CF6]/20 transition-colors group">
            <div className="w-14 h-14 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-[#8B5CF6]/20 transition-colors">
              <Ship className="w-7 h-7 text-[#8B5CF6]" />
            </div>
            <div className="w-8 h-8 rounded-full bg-[#8B5CF6] text-white text-sm font-bold flex items-center justify-center mx-auto mb-4">
              2
            </div>
            <h3 className="text-lg font-semibold text-white font-heading mb-2">Nos encargamos de todo</h3>
            <p className="text-sm text-zinc-400">
              Gestionamos la importación desde Punta del Este, trámites aduaneros y logística hasta tu puerta.
            </p>
          </div>

          <div className="text-center p-8 bg-white/5 border border-white/10 rounded-2xl hover:border-[#22C55E]/20 transition-colors group">
            <div className="w-14 h-14 rounded-xl bg-[#22C55E]/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-[#22C55E]/20 transition-colors">
              <CreditCard className="w-7 h-7 text-[#22C55E]" />
            </div>
            <div className="w-8 h-8 rounded-full bg-[#22C55E] text-white text-sm font-bold flex items-center justify-center mx-auto mb-4">
              3
            </div>
            <h3 className="text-lg font-semibold text-white font-heading mb-2">Recibí en tu casa</h3>
            <p className="text-sm text-zinc-400">
              Te entregamos los productos directamente en tu domicilio. Rápido y seguro.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
