"use client"

import { useEffect, useState, useCallback } from "react"
import { ImagePlus, Plus, Trash2, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"

interface HeroBanner {
  id: string
  type: string
  position: string
  image: string
  link: string | null
  order: number
  isActive: boolean
}

const FLYER_POSITIONS = [
  { key: "flyer-1", label: "Flyer 1 (Cuadrado)" },
  { key: "flyer-2", label: "Flyer 2 (Cuadrado)" },
  { key: "flyer-3", label: "Flyer 3 (Horizontal)" },
  { key: "flyer-4", label: "Flyer 4 (Cuadrado)" },
  { key: "flyer-5", label: "Flyer 5 (Cuadrado)" },
]

export default function HeroAdminPage() {
  const [carousel, setCarousel] = useState<HeroBanner[]>([])
  const [flyers, setFlyers] = useState<HeroBanner[]>([])
  const [uploading, setUploading] = useState(false)

  const loadBanners = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/hero")
      if (!res.ok) throw new Error("Error al cargar")
      const data = await res.json()
      setCarousel(data.carousel || [])
      setFlyers(data.flyers || [])
    } catch {
      toast.error("Error al cargar banners")
    } finally {
      // loading state removed - no spinner
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function initLoad() {
      try {
        const res = await fetch("/api/admin/hero")
        if (!res.ok) throw new Error("Error al cargar")
        const data = await res.json()
        if (!cancelled) {
          setCarousel(data.carousel || [])
          setFlyers(data.flyers || [])
        }
      } catch {
        if (!cancelled) toast.error("Error al cargar banners")
      } finally {
        // loading state removed - no spinner
      }
    }
    initLoad()
    return () => { cancelled = true }
  }, [])

  async function uploadFile(file: File): Promise<string | null> {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      if (!data.url) throw new Error("No URL returned")
      return data.url
    } catch (e) {
      toast.error("Error al subir imagen")
      console.error(e)
      return null
    } finally {
      setUploading(false)
    }
  }

  async function addSlide() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const url = await uploadFile(file)
      if (!url) return
      const res = await fetch("/api/admin/hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "carousel", image: url }),
      })
      if (!res.ok) {
        toast.error("Error al crear slide")
        return
      }
      toast.success("Slide agregado")
      loadBanners()
    }
    input.click()
  }

  async function updateSlideLink(slide: HeroBanner, link: string) {
    const res = await fetch(`/api/admin/hero/${slide.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link: link || null }),
    })
    if (!res.ok) {
      toast.error("Error al actualizar link")
      return
    }
    toast.success("Link actualizado")
    loadBanners()
  }

  async function updateFlyer(pos: string, file: File) {
    const url = await uploadFile(file)
    if (!url) return
    const existing = flyers.find((f) => f.position === pos)
    const res = existing
      ? await fetch(`/api/admin/hero/${existing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: url }),
        })
      : await fetch("/api/admin/hero", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "flyer", position: pos, image: url }),
        })
    if (!res.ok) {
      toast.error("Error al actualizar flyer")
      return
    }
    toast.success("Flyer actualizado")
    loadBanners()
  }

  async function updateFlyerLink(pos: string, link: string) {
    const existing = flyers.find((f) => f.position === pos)
    if (!existing) return
    const res = await fetch(`/api/admin/hero/${existing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link: link || null }),
    })
    if (!res.ok) {
      toast.error("Error al actualizar link")
      return
    }
    toast.success("Link actualizado")
    loadBanners()
  }

  async function toggleSlide(slide: HeroBanner) {
    const res = await fetch(`/api/admin/hero/${slide.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !slide.isActive }),
    })
    if (!res.ok) {
      toast.error("Error al cambiar estado")
      return
    }
    loadBanners()
  }

  async function deleteSlide(id: string) {
    const res = await fetch(`/api/admin/hero/${id}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("Error al eliminar")
      return
    }
    toast.success("Eliminado")
    loadBanners()
  }

  async function reorder(slideId: string, direction: "up" | "down") {
    const idx = carousel.findIndex((s) => s.id === slideId)
    if (idx === -1) return
    const items = [...carousel]
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= items.length) return
    const temp = items[idx].order
    items[idx].order = items[swapIdx].order
    items[swapIdx].order = temp
    ;[items[idx], items[swapIdx]] = [items[swapIdx], items[idx]]

    await Promise.all(
      items.map((s) =>
        fetch(`/api/admin/hero/${s.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: s.order }),
        })
      )
    )
    loadBanners()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-heading">Gestión del Hero</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Administrá el carrusel principal y los flyers de la página de inicio
        </p>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground font-heading">🎠 Carrusel Principal (Cuadrado)</h2>
          <button
            onClick={addSlide}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {uploading ? "Subiendo..." : "Agregar slide"}
          </button>
        </div>

        {carousel.length === 0 ? (
          <div className="border border-dashed border-border/50 rounded-2xl p-12 text-center text-sm text-muted-foreground">
            No hay slides en el carrusel. Agregá la primera.
          </div>
        ) : (
          <div className="space-y-2">
            {carousel.map((slide, i) => (
              <div
                key={slide.id}
                className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/60"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => reorder(slide.id, "up")}
                    disabled={i === 0}
                    className="w-5 h-3 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => reorder(slide.id, "down")}
                    disabled={i === carousel.length - 1}
                    className="w-5 h-3 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    ▼
                  </button>
                </div>

                <img
                  src={slide.image}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />

                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs text-muted-foreground truncate">{slide.image}</p>
                  <div className="flex items-center gap-1.5">
                    <LinkIcon className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Link opcional (URL)"
                      defaultValue={slide.link || ""}
                      onBlur={(e) => updateSlideLink(slide, e.target.value)}
                      className="w-full px-1.5 py-0.5 text-xs bg-background border border-border/40 rounded text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <button
                  onClick={() => toggleSlide(slide)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                    slide.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {slide.isActive ? "Activo" : "Inactivo"}
                </button>

                <button
                  onClick={() => deleteSlide(slide.id)}
                  className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground font-heading mb-4">🖼️ Flyers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FLYER_POSITIONS.map((pos) => {
            const flyer = flyers.find((f) => f.position === pos.key)
            return (
              <div
                key={pos.key}
                className={`p-4 bg-card rounded-xl border border-border/60 ${
                  pos.key === "flyer-3" ? "md:col-span-2" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-foreground">{pos.label}</h3>
                  {flyer && (
                    <button
                      onClick={() => {
                        deleteSlide(flyer.id)
                      }}
                      className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {flyer ? (
                  <div className="relative group">
                    <img
                      src={flyer.image}
                      alt=""
                      className="w-full aspect-video rounded-lg object-cover"
                    />
                    <label className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all rounded-lg cursor-pointer">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ImagePlus className="w-8 h-8 text-white" />
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) updateFlyer(pos.key, file)
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border/50 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                    <ImagePlus className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Subir imagen</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) updateFlyer(pos.key, file)
                      }}
                    />
                  </label>
                )}

                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Link opcional (URL)"
                    defaultValue={flyer?.link || ""}
                    onBlur={(e) => updateFlyerLink(pos.key, e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-background border border-border/60 rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
