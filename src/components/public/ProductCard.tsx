"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Package } from "lucide-react"
import { formatUSD } from "@/lib/utils"
import { fetchExchangeRate } from "@/lib/exchange-rate"

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

  useEffect(() => {
    fetchExchangeRate().then(setExchangeRate)
  }, [])

  const priceARS = exchangeRate ? product.priceUSD * exchangeRate : product.priceARS

  return (
    <Link
      href={`/productos/${product.slug}`}
      className="group block bg-white rounded-2xl border border-[#d2d2d7]/60 overflow-hidden hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-all duration-300"
    >
      <div className="aspect-[4/3] bg-[#f5f5f7] flex items-center justify-center p-8">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
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

        <div className="space-y-0.5">
          <p className="text-lg font-bold text-[#1d1d1f]">{formatUSD(product.priceUSD)}</p>
          {priceARS && (
            <p className="text-xs text-[#6e6e73]">~ ${Math.round(priceARS).toLocaleString("es-AR")} ARS</p>
          )}
        </div>

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
  )
}
