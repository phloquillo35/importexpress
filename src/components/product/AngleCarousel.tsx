"use client"

import { useState, useMemo, useCallback } from "react"
import { ChevronLeft, ChevronRight, Eye } from "lucide-react"

interface AngleMeta {
  category?: "C1" | "C2" | "C3"
  source?: string
  assignedAt?: string
  exception?: string | null
  colorsCount?: number
  imagesPerColor?: Record<string, number>
}

interface AngleCarouselProps {
  /** Per-color image URLs (from parseProductImages) */
  images: string[]
  /** Angle metadata from product.angleMeta */
  angleMeta?: AngleMeta | null
  /** Product name for alt text */
  productName: string
  /** Fallback images when no angles are available (legacy carousel behavior) */
  fallbackImages?: string[]
}

type AngleCategory = "C1" | "C2" | "C3"

const ANGLE_LABELS: Record<AngleCategory, string[]> = {
  C1: ["Frontal", "Izquierda", "Derecha"],
  C2: ["Frontal", "Lateral"],
  C3: ["Frontal"],
}

const VIEW_COUNT_LABELS: Record<AngleCategory, string> = {
  C1: "3 vistas",
  C2: "2 vistas",
  C3: "Solo vista frontal",
}

/**
 * Determines the effective angle category based on actual image count per color.
 * Uses the real image count rather than metadata, so the UI always matches reality.
 */
function resolveCategory(images: string[]): AngleCategory {
  if (images.length >= 3) return "C1"
  if (images.length === 2) return "C2"
  return "C3"
}

/**
 * AngleCarousel — Displays product images organized by viewing angle.
 *
 * - C1 (3 images): Full navigation across front/left/right angles
 * - C2 (2 images): Front + lateral, right mirrors left
 * - C3 (1 image): Front only, navigation disabled
 *
 * Falls back to legacy carousel (all images) when no angle metadata is present.
 */
export function AngleCarousel({
  images,
  angleMeta,
  productName,
  fallbackImages,
}: AngleCarouselProps) {
  // Determine which images and category to use
  const hasAngles = angleMeta?.category != null
  const category = hasAngles ? resolveCategory(images) : null

  // For products without angle metadata, use fallback (legacy behavior)
  const displayImages = hasAngles ? images : (fallbackImages ?? images)
  const displayCategory = hasAngles ? category : null

  // Angle positions to show based on category
  const angleIndices = useMemo(() => {
    if (!displayCategory) return displayImages.map((_, i) => i)
    if (displayCategory === "C1") return [0, 1, 2]
    if (displayCategory === "C2") return [0, 1]
    return [0] // C3
  }, [displayCategory, displayImages])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)

  // Clamp index to valid range when images change (e.g., color switch)
  const safeIndex = Math.min(currentIndex, angleIndices.length - 1)
  const activeIndex = safeIndex < 0 ? 0 : safeIndex

  const goTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, angleIndices.length - 1))
      setCurrentIndex(clamped)
      setIsZoomed(false)
    },
    [angleIndices.length]
  )

  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo])
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo])

  const currentImage = displayImages[angleIndices[activeIndex]]
  const labels = displayCategory ? ANGLE_LABELS[displayCategory] : null
  const currentLabel = labels?.[activeIndex] ?? null
  const canNavigate = displayCategory !== "C3" && angleIndices.length > 1

  if (!currentImage) {
    return (
      <div className="aspect-square bg-muted rounded-2xl flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Sin imagen disponible</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Main image container */}
      <div className="relative aspect-square bg-muted rounded-2xl overflow-hidden group">
        <img
          src={currentImage}
          alt={`${productName} — ${currentLabel ?? `vista ${activeIndex + 1}`}`}
          loading="lazy"
          className={`w-full h-full object-contain p-4 sm:p-8 transition-all duration-300 ${
            isZoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"
          }`}
          onClick={() => setIsZoomed((z) => !z)}
        />

        {/* Navigation arrows — only when there are multiple distinct angles */}
        {canNavigate && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                goPrev()
              }}
              disabled={activeIndex === 0}
              aria-label="Ver ángulo anterior"
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                goNext()
              }}
              disabled={activeIndex === angleIndices.length - 1}
              aria-label="Ver siguiente ángulo"
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </>
        )}

        {/* Angle label overlay */}
        {currentLabel && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
            {currentLabel}
          </div>
        )}
      </div>

      {/* Angle indicator dots */}
      {displayCategory && angleIndices.length > 1 && (
        <div className="flex justify-center gap-2">
          {angleIndices.map((imgIdx, dotIdx) => (
            <button
              key={imgIdx}
              onClick={() => goTo(dotIdx)}
              aria-label={`Ver ángulo ${labels?.[dotIdx] ?? dotIdx + 1}`}
              className={`h-2 rounded-full transition-all duration-200 ${
                dotIdx === activeIndex
                  ? "bg-foreground w-5"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2"
              }`}
            />
          ))}
        </div>
      )}

      {/* View count badge */}
      {displayCategory && (
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
            <Eye className="w-3 h-3" />
            {VIEW_COUNT_LABELS[displayCategory]}
          </span>
        </div>
      )}
    </div>
  )
}
