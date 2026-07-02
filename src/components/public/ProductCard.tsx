"use client"

import Link from "next/link"
import { useEffect, useState, useMemo } from "react"
import { Package, ShoppingBag } from "lucide-react"
import { fetchExchangeRate } from "@/lib/exchange-rate"
import { useCart } from "@/context/CartContext"

const colorSwatch: Record<string, string> = {
  negro: "#1d1d1f", blanco: "#f5f5f7", rojo: "#ff3b30", azul: "#0071e3",
  verde: "#34c759", amarillo: "#ffcc00", gris: "#8e8e93", plateado: "#c0c0c0",
  dorado: "#ffd700", rosa: "#ffc0cb", violeta: "#af52de", marrón: "#a2845e",
  naranja: "#ff9500",
}

interface ProductCardProps {
  product: {
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
}

function getCardColors(images: unknown): string[] {
  if (!images || !Array.isArray(images) || images.length === 0) return []
  if (typeof images[0] === "string") return []
  const colors = [...new Set(images.map((img: unknown) => (img as { color?: string }).color).filter(Boolean))] as string[]
  return colors
}

function getCardImage(images: unknown): string | null {
  if (!images || !Array.isArray(images) || images.length === 0) return null
  const first = images[0]
  if (typeof first === "string") return first
  return (first as { url: string }).url || null
}

export function ProductCard({ product }: ProductCardProps) {
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const { addItem } = useCart()

  const cardColors = useMemo(() => getCardColors(product.images), [product.images])
  const cardImage = useMemo(() => getCardImage(product.images), [product.images])

  useEffect(() => {
    fetchExchangeRate().then(setExchangeRate)
  }, [])

  const displayPrice = product.finalPriceARS || (exchangeRate ? product.priceUSD * exchangeRate : product.priceARS) || 0
  const price = Math.round(displayPrice)

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      slug: product.slug,
      name: product.name,
      price,
      image: cardImage,
    })
  }

  return (
    <div className="group block bg-white rounded-2xl border border-[#d2d2d7]/60 overflow-hidden hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-all duration-300">
      <Link href={`/productos/${product.slug}`} className="block">
        <div className="aspect-[4/3] bg-[#f5f5f7] flex items-center justify-center p-8">
          {cardImage ? (
            <img
              src={cardImage}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <Package className="w-16 h-16 text-[#6e6e73]" />
          )}
        </div>

        {cardColors.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 px-5 pt-3">
            {cardColors.map(color => (
              <span
                key={color}
                className="w-3 h-3 rounded-full border border-zinc-300"
                style={{ backgroundColor: colorSwatch[color.toLowerCase()] || "#c0c0c0" }}
                title={color}
              />
            ))}
          </div>
        )}

        <div className={`p-5 space-y-3 ${cardColors.length > 1 ? "pt-2" : ""}`}>
          {product.category && (
            <span className="inline-block text-[11px] font-medium uppercase tracking-wider text-[#0071e3]">
              {product.category.name}
            </span>
          )}

          <h3 className="font-heading font-semibold text-[#1d1d1f] text-sm leading-tight line-clamp-2">
            {product.name}
          </h3>

          {price > 0 && (
            <p className="text-lg font-bold text-[#1d1d1f]">${price.toLocaleString("es-AR")} ARS</p>
          )}

          {product.hasFinancing && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0071e3] bg-[#e8f0fe] px-2.5 py-1 rounded-full">
              3 o 6 cuotas
            </span>
          )}

          <div>
            <span className="text-[11px] font-medium text-[#34c759]">
              Disponible
            </span>
          </div>
        </div>
      </Link>

      <div className="px-5 pb-5">
        <button
          onClick={handleAdd}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium rounded-full transition-colors"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Agregar
        </button>
      </div>
    </div>
  )
}
