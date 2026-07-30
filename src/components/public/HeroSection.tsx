"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
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
  const [carousel, setCarousel] = useState<HeroBanner[]>([])
  const [flyers, setFlyers] = useState<HeroBanner[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <section className="py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="hidden lg:grid grid-cols-[220px_1fr_1fr] gap-4">
          <HeroSidebar />
          <div className="min-h-full">
            <HeroCarousel slides={carousel} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FlyerSlot banner={getFlyer("flyer-1")} className="aspect-square" />
            <FlyerSlot banner={getFlyer("flyer-2")} className="aspect-square" />
            <FlyerSlot banner={getFlyer("flyer-3")} className="col-span-2 aspect-[2/1]" />
            <FlyerSlot banner={getFlyer("flyer-4")} className="aspect-square" />
            <FlyerSlot banner={getFlyer("flyer-5")} className="aspect-square" />
          </div>
        </div>

        <div className="lg:hidden space-y-4">
          <HeroCarousel slides={carousel} />
          <div className="grid grid-cols-2 gap-2">
            <FlyerSlot banner={getFlyer("flyer-1")} className="aspect-square" />
            <FlyerSlot banner={getFlyer("flyer-2")} className="aspect-square" />
            <FlyerSlot banner={getFlyer("flyer-3")} className="col-span-2 aspect-[2/1]" />
            <FlyerSlot banner={getFlyer("flyer-4")} className="aspect-square" />
            <FlyerSlot banner={getFlyer("flyer-5")} className="aspect-square" />
          </div>
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
