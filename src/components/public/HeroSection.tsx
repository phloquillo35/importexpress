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

interface InitialHero {
  carousel: HeroBanner[]
  flyers: HeroBanner[]
}

interface Category {
  id: string
  name: string
  slug: string
  parent: { id: string; name: string; slug: string } | null
  _count: { products: number }
  children: { id: string; name: string; slug: string; _count: { products: number } }[]
}

export function HeroSection({ initialCategories, initialHero }: { initialCategories?: Category[]; initialHero?: InitialHero }) {
  const router = useRouter()
  const [carousel, setCarousel] = useState<HeroBanner[]>(initialHero?.carousel ?? [])
  const [flyers, setFlyers] = useState<HeroBanner[]>(initialHero?.flyers ?? [])
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (initialHero) return
    async function load() {
      try {
        const res = await fetch("/api/hero")
        const data = await res.json()
        setCarousel(data.carousel || [])
        setFlyers(data.flyers || [])
      } catch {
        setCarousel([])
        setFlyers([])
      }
    }
    load()
  }, [initialHero])

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
        <div className="hidden lg:grid grid-cols-[220px_3fr_2fr] gap-4">
          <div className="row-span-2 h-full min-h-0">
            <HeroSidebar overlayDropdown showVerTodas initialCategories={initialCategories} />
          </div>
          <div className="row-span-2 aspect-square">
            <HeroCarousel slides={carousel} />
          </div>
          <div>
            {flyersGrid}
          </div>
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
              className="w-full pl-9 pr-4 py-2.5 bg-muted border border-border/60 rounded-full text-[16px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition-all"
            />
          </form>

          <div className="w-full aspect-square md:aspect-[4/3] max-lg:landscape:aspect-auto max-lg:landscape:h-[55dvh] max-lg:landscape:max-h-[560px]">
            <HeroCarousel slides={carousel} />
          </div>

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
