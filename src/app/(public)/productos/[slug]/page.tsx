"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Package, ArrowLeft, ShoppingBag, ShieldCheck, Truck, AlertCircle } from "lucide-react"
import Link from "next/link"
import { formatUSD } from "@/lib/utils"
import { fetchExchangeRate } from "@/lib/exchange-rate"
import { ProductCard } from "@/components/public/ProductCard"
import { Skeleton } from "@/components/ui/skeleton"

interface Product {
  id: string
  slug: string
  name: string
  description: string | null
  specs: Record<string, string> | null
  images: string[]
  priceUSD: number
  priceARS: number | null
  costUSD: number | null
  stock: number
  isAvailable: boolean
  category: { name: string; slug: string } | null
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)

  useEffect(() => {
    fetchExchangeRate().then(setExchangeRate)
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(false)
      try {
        const res = await fetch(`/api/productos/${slug}`)
        if (!res.ok) {
          if (res.status === 404) { setNotFound(true); return }
          throw new Error("Error al cargar el producto")
        }
        const data = await res.json()
        setProduct(data.product)
        setRelated(data.related || [])
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white font-heading mb-2">Error al cargar el producto</h1>
        <p className="text-zinc-400 mb-6">No pudimos cargar la información. Intentá de nuevo más tarde.</p>
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 text-[#F59E0B] hover:text-[#D97706] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al catálogo
        </Link>
      </div>
    )
  }

  if (notFound || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white font-heading mb-2">Producto no encontrado</h1>
        <p className="text-zinc-400 mb-6">El producto que buscás no existe o fue eliminado</p>
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 text-[#F59E0B] hover:text-[#D97706] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al catálogo
        </Link>
      </div>
    )
  }

  const specs = product.specs as Record<string, string> | null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
      <Link
        href="/productos"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
        <div className="aspect-square bg-zinc-800/30 border border-white/10 rounded-2xl flex items-center justify-center overflow-hidden">
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-24 h-24 text-zinc-600" />
          )}
        </div>

        <div>
          {product.category && (
            <Link
              href={`/categorias/${product.category.slug}`}
              className="inline-block text-xs font-medium uppercase tracking-wider text-[#F59E0B] bg-[#F59E0B]/10 px-3 py-1 rounded-full mb-4 hover:bg-[#F59E0B]/20 transition-colors"
            >
              {product.category.name}
            </Link>
          )}

          <h1 className="text-2xl lg:text-3xl font-bold text-white font-heading mb-4">{product.name}</h1>

          <div className="space-y-1 mb-6">
            <p className="text-3xl font-bold text-[#F59E0B]">{formatUSD(product.priceUSD)}</p>
            {(exchangeRate || product.priceARS) && (
              <p className="text-base text-zinc-400">
                ~ ${Math.round(exchangeRate ? product.priceUSD * exchangeRate : product.priceARS!).toLocaleString("es-AR")} ARS
              </p>
            )}
          </div>

          {product.description && (
            <p className="text-zinc-400 leading-relaxed mb-8">{product.description}</p>
          )}

          <div className="flex flex-wrap gap-3 mb-8">
            {product.stock > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-[#22C55E] bg-[#22C55E]/10 px-3 py-1.5 rounded-full">
                <ShieldCheck className="w-4 h-4" />
                En stock ({product.stock} unidades)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full">
                Sin stock
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-sm text-zinc-400 bg-white/5 px-3 py-1.5 rounded-full">
              <Truck className="w-4 h-4" />
              Importado desde Punta del Este
            </span>
          </div>

          <a
            href={`https://wa.me/5491123456789?text=${encodeURIComponent(`Hola! Me interesa el producto: ${product.name} (${formatUSD(product.priceUSD)})`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#22C55E] hover:bg-[#16A34A] text-white font-semibold rounded-xl transition-colors w-full sm:w-auto justify-center"
          >
            <ShoppingBag className="w-5 h-5" />
            Consultar por WhatsApp
          </a>

          {product.costUSD && (
            <p className="text-xs text-zinc-600 mt-4">
              Precio de referencia USD. El precio final puede variar según el tipo de cambio del día.
            </p>
          )}
        </div>
      </div>

      {specs && Object.keys(specs).length > 0 && (
        <div className="mt-12 lg:mt-16">
          <h2 className="text-xl font-bold text-white font-heading mb-6">Especificaciones Técnicas</h2>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden max-w-2xl">
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(specs).map(([key, value], i) => (
                  <tr key={key} className={i % 2 === 0 ? "bg-white/5" : ""}>
                    <td className="px-4 py-3 text-zinc-400 font-medium capitalize w-1/3">{key.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-zinc-200">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div className="mt-12 lg:mt-16">
          <h2 className="text-xl font-bold text-white font-heading mb-6">Productos Relacionados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
