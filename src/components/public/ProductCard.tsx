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
      className="group block bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-all duration-300"
    >
      <div className="aspect-[4/3] bg-zinc-800/50 flex items-center justify-center">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <Package className="w-16 h-16 text-zinc-600" />
        )}
      </div>

      <div className="p-4 space-y-3">
        {product.category && (
          <span className="inline-block text-[10px] font-medium uppercase tracking-wider text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-full">
            {product.category.name}
          </span>
        )}

        <h3 className="font-heading font-semibold text-white text-sm leading-tight group-hover:text-[#F59E0B] transition-colors line-clamp-2">
          {product.name}
        </h3>

        <div className="space-y-0.5">
          <p className="text-lg font-bold text-white">{formatUSD(product.priceUSD)}</p>
          {priceARS && (
            <p className="text-xs text-zinc-400">~ ${Math.round(priceARS).toLocaleString("es-AR")} ARS</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {product.stock > 0 ? (
            <span className="text-[10px] font-medium text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded-full">
              En stock
            </span>
          ) : (
            <span className="text-[10px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
              Sin stock
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
