"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { Package, ArrowLeft, ShoppingBag, ShieldCheck, Truck, AlertCircle, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { fetchExchangeRate } from "@/lib/exchange-rate"
import { ProductCard } from "@/components/public/ProductCard"
import { Skeleton } from "@/components/ui/skeleton"
import { useCart } from "@/context/CartContext"

interface Product {
  id: string
  slug: string
  name: string
  description: string | null
  specs: Record<string, string> | null
  images: string[]
  priceUSD: number
  priceARS: number | null
  finalPriceARS: number
  costUSD: number | null
  stock: number
  isAvailable: boolean
  hasFinancing: boolean
  category: { name: string; slug: string; parent: { name: string; slug: string } | null } | null
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)

  function parseProductImages(images: unknown): { colors: string[]; byColor: Record<string, string[]> } {
    if (!images || !Array.isArray(images) || images.length === 0) {
      return { colors: [], byColor: {} }
    }
    if (typeof images[0] === "string") {
      return { colors: ["Único"], byColor: { Único: images as string[] } }
    }
    const byColor: Record<string, string[]> = {}
    for (const item of images) {
      const img = item as { url: string; color?: string }
      const color = img.color || "Único"
      if (!byColor[color]) byColor[color] = []
      byColor[color].push(img.url)
    }
    return { colors: Object.keys(byColor), byColor }
  }

  const parsed = useMemo(() => product ? parseProductImages(product.images) : { colors: [], byColor: {} }, [product])
  const [selectedColor, setSelectedColor] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentImages = selectedColor ? parsed.byColor[selectedColor] || [] : []

  useEffect(() => {
    if (parsed.colors.length > 0) {
      setSelectedColor(parsed.colors[0])
      setCurrentIndex(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id])

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 bg-card">
        <div className="space-y-6">
          <Skeleton className="h-6 w-32 bg-muted" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <Skeleton className="aspect-square rounded-2xl bg-muted" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-20 bg-muted" />
              <Skeleton className="h-8 w-3/4 bg-muted" />
              <Skeleton className="h-6 w-24 bg-muted" />
              <Skeleton className="h-20 w-full bg-muted" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center bg-card">
        <AlertCircle className="w-16 h-16 text-[#ff3b30] mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground font-heading mb-2">Error al cargar el producto</h1>
        <p className="text-muted-foreground mb-6">No pudimos cargar la información. Intentá de nuevo más tarde.</p>
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 text-primary hover:text-[#0077ed] transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al catálogo
        </Link>
      </div>
    )
  }

  if (notFound || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center bg-card">
        <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground font-heading mb-2">Producto no encontrado</h1>
        <p className="text-muted-foreground mb-6">El producto que buscás no existe o fue eliminado</p>
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 text-primary hover:text-[#0077ed] transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al catálogo
        </Link>
      </div>
    )
  }

  const { addItem } = useCart()
  const specs = product.specs as Record<string, string> | null
  const arsPrice = (product as any).finalPriceARS || (exchangeRate ? product.priceUSD * exchangeRate : product.priceARS) || 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
      <Link
        href="/productos"
        className="inline-flex items-center gap-2 text-sm text-foreground/70 dark:text-muted-foreground hover:text-primary mb-8 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
        <div className="space-y-4">
          <div className="aspect-square bg-muted rounded-2xl flex items-center justify-center overflow-hidden relative">
            {currentImages.length > 0 ? (
              <>
                <img
                  src={currentImages[currentIndex]}
                  alt={product.name}
                  loading="lazy"
                  className="w-full h-full object-contain p-8 transition-opacity duration-300"
                />
                {currentImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentIndex(i => (i - 1 + currentImages.length) % currentImages.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-md transition-all"
                    >
                      <ChevronLeft className="w-5 h-5 text-foreground" />
                    </button>
                    <button
                      onClick={() => setCurrentIndex(i => (i + 1) % currentImages.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-md transition-all"
                    >
                      <ChevronRight className="w-5 h-5 text-foreground" />
                    </button>
                  </>
                )}
              </>
            ) : (
              <Package className="w-24 h-24 text-muted-foreground" />
            )}
          </div>

          {currentImages.length > 1 && (
            <div className="flex justify-center gap-2">
              {currentImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentIndex ? "bg-[#1d1d1f] w-4" : "bg-[#d2d2d7]"
                  }`}
                />
              ))}
            </div>
          )}

          {parsed.colors.length > 1 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {parsed.colors.map(color => (
                <button
                  key={color}
                  onClick={() => { setSelectedColor(color); setCurrentIndex(0) }}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    selectedColor === color
                      ? "bg-[#1d1d1f] text-white border-[#1d1d1f]"
                      : "bg-card text-foreground border-border hover:border-[#1d1d1f]"
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center">
          {product.category && (
            <Link
              href={`/categorias/${product.category.slug}`}
              className="inline-block text-xs font-medium uppercase tracking-wider text-primary mb-3"
            >
              {product.category.parent
                ? `${product.category.parent.name} - ${product.category.name}`
                : product.category.name}
            </Link>
          )}

          <h1 className="text-2xl lg:text-3xl font-bold text-foreground font-heading mb-4">{product.name}</h1>

          {arsPrice && (
            <p className="text-3xl font-bold text-foreground mb-6">${Math.round(arsPrice).toLocaleString("es-AR")} ARS</p>
          )}

          {product.description && (
            <p className="text-foreground leading-relaxed mb-8">{product.description}</p>
          )}

          <div className="flex flex-wrap gap-3 mb-8">
            <span className="inline-flex items-center gap-1.5 text-sm text-[#34c759] bg-muted px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-4 h-4" />
              Disponible
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <Truck className="w-4 h-4" />
              Importado desde Ciudad del Este, Paraguay
            </span>
            {product.hasFinancing && (
              <span className="inline-flex items-center gap-1.5 text-sm text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                3 o 6 cuotas
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => addItem({ slug: product.slug, name: product.name, price: Math.round(arsPrice ?? 0), image: (currentImages[currentIndex] || product.images?.[0]) ?? null })}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#34c759] hover:bg-[#28a745] text-white font-medium rounded-full transition-colors w-full sm:w-auto justify-center"
            >
              <Plus className="w-5 h-5" />
              Agregar al carrito
            </button>
            <a
              href={`https://wa.me/5491123456789?text=${encodeURIComponent(`Hola! Me interesa el producto: ${product.name} (${arsPrice ? "$" + Math.round(arsPrice).toLocaleString("es-AR") + " ARS" : "consultar precio"})`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-full transition-colors w-full sm:w-auto justify-center"
            >
              <ShoppingBag className="w-5 h-5" />
              Consultar por WhatsApp
            </a>
          </div>

          {product.costUSD && (
            <p className="text-xs text-foreground/70 dark:text-muted-foreground mt-4">
              El precio final puede variar según el tipo de cambio del día.
            </p>
          )}
        </div>
      </div>

      {specs && Object.keys(specs).length > 0 && (
        <div className="mt-12 lg:mt-16">
          <h2 className="text-xl font-bold text-foreground font-heading mb-6">Especificaciones Técnicas</h2>
          <div className="bg-muted rounded-2xl overflow-hidden max-w-2xl border border-border/60">
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(specs).map(([key, value], i) => (
                  <tr key={key} className={i % 2 === 0 ? "bg-card/50" : ""}>
                    <td className="px-5 py-3.5 text-muted-foreground font-medium capitalize w-1/3">{key.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3.5 text-foreground">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div className="mt-12 lg:mt-16">
          <h2 className="text-xl font-bold text-foreground font-heading mb-6">Productos Relacionados</h2>
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
