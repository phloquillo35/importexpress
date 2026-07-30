"use client"

import Link from "next/link"
import { useEffect, useState, useMemo } from "react"
import { Package, ShoppingBag } from "lucide-react"
import { fetchExchangeRate } from "@/lib/exchange-rate"
import { useCart } from "@/context/CartContext"
import { colorSwatch, swatchStyle } from "@/lib/colors"

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
    freeShipping: boolean
    category: { name: string; slug: string; parent: { name: string; slug: string } | null } | null
  }
  colorName?: string | null
}

function getCardColors(images: unknown): string[] {
  if (!images || !Array.isArray(images) || images.length === 0) return []
  if (typeof images[0] === "string") return []
  const colors = [...new Set(images.map((img: unknown) => (img as { color?: string }).color).filter(Boolean))] as string[]
  return colors
}

function getCardImage(images: unknown, colorName?: string | null): string | null {
  if (!images || !Array.isArray(images) || images.length === 0) return null
  if (colorName) {
    for (const item of images) {
      const img = item as { url: string; color?: string }
      if (img.color?.toLowerCase() === colorName.toLowerCase()) return img.url
    }
    return null
  }
  const first = images[0]
  if (typeof first === "string") return first
  return (first as { url: string }).url || null
}

export function ProductCard({ product, colorName }: ProductCardProps) {
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const { addItem } = useCart()

  const cardColors = useMemo(() => getCardColors(product.images), [product.images])
  const cardImage = useMemo(() => getCardImage(product.images, colorName), [product.images, colorName])
  const colorStyle = colorName ? swatchStyle(colorName) : null

  useEffect(() => {
    fetchExchangeRate().then(setExchangeRate)
  }, [])

  const displayPrice = product.finalPriceARS || (exchangeRate ? product.priceUSD * exchangeRate : product.priceARS) || 0
  const price = Math.round(displayPrice)
  const href = colorName ? `/productos/${product.slug}?color=${encodeURIComponent(colorName)}` : `/productos/${product.slug}`

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      slug: product.slug,
      color: colorName || null,
      name: colorName ? `${product.name} (${colorName})` : product.name,
      price,
      image: cardImage,
    })
  }

  return (
    <div className="group block bg-card rounded-2xl border border-border/60 overflow-hidden hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-all duration-300">
      <Link href={href} className="block">
        <div className="aspect-[4/3] bg-muted flex items-center justify-center p-8">
          {cardImage ? (
            <img
              src={cardImage}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <Package className="w-16 h-16 text-muted-foreground" />
          )}
        </div>

        {colorName && colorStyle ? (
          <div className="flex items-center justify-center gap-1.5 px-5 pt-3">
            <span
              className="w-3 h-3 rounded-full border border-muted-foreground/30"
              style={colorStyle}
            />
            <span className="text-xs font-medium text-muted-foreground capitalize">{colorName}</span>
          </div>
        ) : cardColors.length > 1 ? (
          <div className="flex items-center justify-center gap-1.5 px-5 pt-3">
            {cardColors.map(color => (
              <span
                key={color}
                className="w-3 h-3 rounded-full border border-muted-foreground/30"
                style={swatchStyle(color)}
                title={color}
              />
            ))}
          </div>
        ) : null}

        <div className={`p-5 space-y-3 ${(colorName || cardColors.length > 1) ? "pt-2" : ""}`}>
          {product.category && (
            <span className="inline-block text-[11px] font-medium uppercase tracking-wider text-primary">
              {product.category.parent
                ? `${product.category.parent.name} - ${product.category.name}`
                : product.category.name}
            </span>
          )}

          <h3 className="font-heading font-semibold text-card-foreground text-sm leading-tight line-clamp-2">
            {product.name}
          </h3>

          {price > 0 && (
            <p className="text-lg font-bold text-card-foreground">${price.toLocaleString("es-AR")} ARS</p>
          )}

          {product.hasFinancing && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              3 o 6 cuotas
            </span>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#34c759]">Disponible</span>
            {product.freeShipping && (
              <span className="text-[11px] font-medium text-[#34c759]">Envío gratis</span>
            )}
          </div>
        </div>
      </Link>

      <div className="px-5 pb-5">
        <button
          onClick={handleAdd}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-full transition-colors"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Agregar
        </button>
      </div>
    </div>
  )
}
