"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Package, ArrowLeft, ShoppingBag, ShieldCheck, Truck, AlertCircle, Plus, ChevronLeft, ChevronRight, X } from "lucide-react"
import Link from "next/link"
import { fetchExchangeRate } from "@/lib/exchange-rate"
import { ProductCard } from "@/components/public/ProductCard"
import { WhatsAppAgentSelector } from "@/components/public/WhatsAppAgentSelector"
import { Skeleton } from "@/components/ui/skeleton"
import { useCart } from "@/context/CartContext"
import { swatchStyle } from "@/lib/colors"
import { flyToCart } from "@/lib/flyToCart"

interface SpecItem {
  key: string
  value: string
  order?: number
}

interface Product {
  id: string
  slug: string
  name: string
  description: string | null
  specs: SpecItem[] | Record<string, string> | null
  images: string[]
  priceUSD: number
  priceARS: number | null
  finalPriceARS: number
  costUSD: number | null
  stock: number
  isAvailable: boolean
  hasFinancing: boolean
  freeShipping: boolean
  category: { name: string; slug: string; parent: { name: string; slug: string } | null } | null
}

function ProductDetailContent() {
  const { slug } = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [selectedColor, setSelectedColor] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", phone: "", address: "", email: "" })
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const imagePanelRef = useRef<HTMLDivElement>(null)

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

  // Defer color initialization to avoid cascading renders from effects
  useEffect(() => {
    if (parsed.colors.length > 0 && !selectedColor) {
      const fromUrl = searchParams.get("color")
      const match = fromUrl && parsed.colors.find(c => c.toLowerCase() === fromUrl.toLowerCase())
      const timer = setTimeout(() => {
        setSelectedColor(match || parsed.colors[0])
        setCurrentIndex(0)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [parsed.colors, searchParams, selectedColor])

  const currentImages = selectedColor ? parsed.byColor[selectedColor] || [] : []

  useEffect(() => {
    fetchExchangeRate().then(setExchangeRate)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/productos/${slug}`)
        if (!res.ok) {
          if (res.status === 404) { if (!cancelled) setNotFound(true); return }
          throw new Error("Error al cargar el producto")
        }
        const data = await res.json()
        if (!cancelled) {
          setProduct(data.product)
          setRelated(data.related || [])
        }
      } catch (_) {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  const { addItem } = useCart()

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

const specs = product.specs
const arsPrice = product.finalPriceARS || (exchangeRate ? product.priceUSD * exchangeRate : product.priceARS) || 0

function buildProductMessage() {
  if (!product) return "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const productUrl = origin ? `${origin}/productos/${product.slug}` : "";
  const lines: string[] = ["¡Hola! Quiero hacer un pedido:\n"];
  lines.push("🛒 *Producto:*");
  lines.push(
    `1. ${product.name} - $${Math.round(arsPrice).toLocaleString("es-AR")} ARS`
  );
  if (productUrl) {
    lines.push(`   🔗 ${productUrl}`);
  }
  lines.push(`\n💰 *Total:* $${Math.round(arsPrice).toLocaleString("es-AR")} ARS`);
  lines.push(`\n👤 *Datos:*`);
  lines.push(`Nombre: ${form.name}`);
  lines.push(`Teléfono: ${form.phone}`);
  lines.push(`Dirección: ${form.address}`);
  lines.push(`Email: ${form.email}`);
  lines.push("\n¡Gracias!");
  return lines.join("\n");
}

function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  const msg = buildProductMessage();
  setPendingMessage(msg);
  setForm({ name: "", phone: "", address: "", email: "" });
  setShowForm(false);
}

  return (
    <>
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
          <div ref={imagePanelRef} className="aspect-square bg-muted rounded-2xl flex items-center justify-center overflow-hidden relative">
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
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    selectedColor === color
                      ? "bg-[#1d1d1f] text-white border-[#1d1d1f]"
                      : "bg-card text-foreground border-border hover:border-[#1d1d1f]"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full border border-muted-foreground/30 flex-shrink-0" style={swatchStyle(color)} />
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
              onClick={(e) => {
                e.preventDefault()
                flyToCart(e.currentTarget, imagePanelRef.current)
                addItem({ slug: product.slug, color: parsed.colors.length <= 1 ? null : selectedColor, name: product.name, price: Math.round(arsPrice ?? 0), image: (currentImages[currentIndex] || product.images?.[0]) ?? null })
              }}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#34c759] hover:bg-[#28a745] text-white font-medium rounded-full transition-colors w-full sm:w-auto justify-center"
            >
              <Plus className="w-5 h-5" />
              Agregar al carrito
            </button>
<button
               onClick={() => setShowForm(true)}
               className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-full transition-colors w-full sm:w-auto justify-center"
             >
               <ShoppingBag className="w-5 h-5" />
               Consultar por WhatsApp
             </button>
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
                {(Array.isArray(specs) 
                  ? specs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  : Object.entries(specs as Record<string, string>).map(([key, value], i) => ({ key, value, order: i }))
                ).map((spec, i) => (
                  <tr key={spec.key} className={i % 2 === 0 ? "bg-card/50" : ""}>
                    <td className="px-5 py-3.5 text-muted-foreground font-medium capitalize w-1/3">{spec.key.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3.5 text-foreground">{spec.value}</td>
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

{showForm && (
  <>
    <div className="fixed inset-0 z-[50] bg-black/40" onClick={() => setShowForm(false)} />
    <div className="fixed top-0 right-0 z-[60] h-screen w-full sm:w-[420px] bg-background shadow-2xl transition-transform duration-300 flex flex-col touch-manipulation translate-x-0">
      <div className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 border-b border-border/50">
        <h2 className="font-heading font-semibold text-foreground text-lg">Consultar por WhatsApp</h2>
        <button onClick={() => setShowForm(false)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" aria-label="Cerrar">
          <X className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        <input
          type="text"
          placeholder="Nombre completo"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          required
          className="w-full px-4 py-2.5 bg-muted border border-border/60 rounded-xl text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        <input
          type="tel"
          placeholder="Teléfono"
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          required
          className="w-full px-4 py-2.5 bg-muted border border-border/60 rounded-xl text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        <input
          type="text"
          placeholder="Dirección"
          value={form.address}
          onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
          required
          className="w-full px-4 py-2.5 bg-muted border border-border/60 rounded-xl text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          required
          className="w-full px-4 py-2.5 bg-muted border border-border/60 rounded-xl text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        <button type="submit" className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-full transition-colors">
          Enviar consulta por WhatsApp
        </button>
        <button type="button" onClick={() => setShowForm(false)} className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          Volver
        </button>
      </form>
    </div>
  </>
)}

<WhatsAppAgentSelector
         open={pendingMessage !== null}
         onClose={() => setPendingMessage(null)}
         message={pendingMessage ?? ""}
       />
    </>
  )
}

export default function ProductDetailPage() {
  return <ProductDetailContent />
}
