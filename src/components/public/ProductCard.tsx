"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Package, ShoppingBag } from "lucide-react"
import { fetchExchangeRate } from "@/lib/exchange-rate"
import { useCart } from "@/context/CartContext"

interface ProductCardProps {
  product: {
    slug: string
    name: string
    priceUSD: number
    priceARS: number | null
    images: string[]
    stock: number
    category: { name: string; slug: string } | null
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const { addItem } = useCart()

  useEffect(() => {
    fetchExchangeRate().then(setExchangeRate)
  }, [])

  const arsPrice = exchangeRate ? product.priceUSD * exchangeRate : product.priceARS

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      slug: product.slug,
      name: product.name,
      price: Math.round(arsPrice ?? 0),
      image: product.images?.[0] ?? null,
    })
  }

  return (
    <div className="group block bg-white rounded-2xl border border-[#d2d2d7]/60 overflow-hidden hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-all duration-300">
      <Link href={`/productos/${product.slug}`} className="block">
        <div className="aspect-[4/3] bg-[#f5f5f7] flex items-center justify-center p-8">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <Package className="w-16 h-16 text-[#6e6e73]" />
          )}
        </div>

        <div className="p-5 space-y-3">
          {product.category && (
            <span className="inline-block text-[11px] font-medium uppercase tracking-wider text-[#0071e3]">
              {product.category.name}
            </span>
          )}

          <h3 className="font-heading font-semibold text-[#1d1d1f] text-sm leading-tight line-clamp-2">
            {product.name}
          </h3>

          {arsPrice && (
            <p className="text-lg font-bold text-[#1d1d1f]">${Math.round(arsPrice).toLocaleString("es-AR")} ARS</p>
          )}

          <div>
            {product.stock > 0 ? (
              <span className="text-[11px] font-medium text-[#34c759]">
                En stock
              </span>
            ) : (
              <span className="text-[11px] font-medium text-[#ff3b30]">
                Sin stock
              </span>
            )}
          </div>
        </div>
      </Link>

      {product.stock > 0 && (
        <div className="px-5 pb-5">
          <button
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium rounded-full transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Agregar
          </button>
        </div>
      )}
    </div>
  )
}
