"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Slide {
  id: string
  image: string
  link: string | null
}

interface HeroCarouselProps {
  slides: Slide[]
  interval?: number
}

export function HeroCarousel({ slides, interval = 5000 }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length)
  }, [slides.length])

  useEffect(() => {
    if (paused || slides.length <= 1) return
    const timer = setInterval(next, interval)
    return () => clearInterval(timer)
  }, [paused, slides.length, interval, next])

  if (!slides.length) {
    return (
      <div className="w-full h-full rounded-2xl bg-muted flex items-center justify-center text-muted-foreground text-sm">
        Sin slides
      </div>
    )
  }

  const slide = slides[current]

  const Wrapper = slide.link ? Link : "div"

  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-2xl group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Wrapper
        href={slide.link || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("block w-full h-full", slide.link && "cursor-pointer")}
      >
        <img
          src={slide.image}
          alt=""
          className="w-full h-full object-cover"
          draggable={false}
        />
      </Wrapper>

      {slides.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Siguiente"
          >
            ›
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  i === current ? "bg-white w-4" : "bg-white/50 hover:bg-white/70"
                )}
                aria-label={`Ir a slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
