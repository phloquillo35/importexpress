"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { HeroCarousel } from "./HeroCarousel"
import { HeroSidebar } from "./HeroSidebar"

interface HeroBanner {
  id: string
  type: string
  position: string
  image: string
  link: string | null
}

export function HeroSection() {
  const router = useRouter()
  const [carousel, setCarousel] = useState<HeroBanner[]>([])
  const [flyers, setFlyers] = useState<HeroBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/hero")
        const data = await res.json()
        setCarousel(data.carousel || [])
        setFlyers(data.flyers || [])
      } catch {
        setCarousel([])
        setFlyers([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <section className="py-8 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="hidden lg:grid grid-cols-[220px_1fr_1fr] gap-4">
            <div className="rounded-2xl bg-muted animate-pulse" />
            <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
            <div className="grid grid-cols-2 gap-2">
              <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
              <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
              <div className="col-span-2 aspect-[2/1] rounded-2xl bg-muted animate-pulse" />
              <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
              <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
            </div>
          </div>
          <div className="lg:hidden space-y-4">
            <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
          </div>
        </div>
      </section>
    )
  }

  const getFlyer = (pos: string) => flyers.find((f) => f.position === pos)

  const flyersGrid = (
    <div className="grid grid-cols-2 gap-2">
      <FlyerSlot banner={getFlyer("flyer-1")} className="aspect-square" />
      <FlyerSlot banner={getFlyer("flyer-2")} className="aspect-square" />
      <FlyerSlot banner={getFlyer("flyer-3")} className="col-span-2 aspect-[2/1]" />
      <FlyerSlot banner={getFlyer("flyer-4")} className="aspect-square" />
      <FlyerSlot banner={getFlyer("flyer-5")} className="aspect-square" />
    </div>
  )

  return (
    <section className="py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="hidden lg:grid grid-cols-[220px_1fr_1fr] gap-4">
          <HeroSidebar />
          <div className="min-h-full">
            <HeroCarousel slides={carousel} />
          </div>
          {flyersGrid}
        </div>

        <div className="lg:hidden space-y-4">
          <form
            onSubmit={(e) => { e.preventDefault(); router.push(`/productos?search=${encodeURIComponent(search)}`); setSearch("") }}
            className="relative w-full"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar productos..."
              className="w-full pl-9 pr-4 py-2.5 bg-muted border border-border/60 rounded-full text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition-all"
            />
          </form>

          <HeroCarousel slides={carousel} />

          {flyersGrid}
        </div>
      </div>
    </section>
  )
}

function FlyerSlot({ banner, className }: { banner: HeroBanner | undefined; className: string }) {
  const Wrapper = banner?.link ? Link : "div"

  if (!banner) {
    return (
      <div className={`rounded-2xl bg-muted/50 border border-dashed border-border/40 flex items-center justify-center text-muted-foreground/40 text-xs ${className}`}>
        Sin imagen
      </div>
    )
  }

  return (
    <Wrapper
      href={banner.link || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className={`rounded-2xl overflow-hidden bg-card group ${banner.link ? "cursor-pointer" : ""} ${className}`}
    >
      <img
        src={banner.image}
        alt=""
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        draggable={false}
      />
    </Wrapper>
  )
}
