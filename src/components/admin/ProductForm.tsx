"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { Plus, X, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { calculateFinalPrice } from "@/lib/pricing"

interface ProductFormData {
  name: string
  slug: string
  description: string
  costUSDT: string
  yoniEnabled: boolean
  yoniPercentage: string
  hasFinancing: boolean
  shippingCost: string
  profitType: string
  profitValue: string
  stock: string
  minStock: string
  isAvailable: boolean
  isFeatured: boolean
  categoryId: string
  distributorId: string
}

interface Category {
  id: string
  name: string
}

interface Distributor {
  id: string
  name: string
}

interface ColorGroup {
  name: string
  images: string[]
}

interface ProductFormProps {
  defaultValues?: Partial<ProductFormData> & { yoniPercentage?: string; images?: string[] | { url: string; color: string }[]; specs?: Record<string, string>; finalPriceUSD?: number; finalPriceARS?: number }
  productSlug?: string
}

export function ProductForm({ defaultValues, productSlug }: ProductFormProps) {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [exchangeRate, setExchangeRate] = useState(1)
  const [usdtRate, setUsdtRate] = useState(1)
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>(
    defaultValues?.specs ? Object.entries(defaultValues.specs).map(([k, v]) => ({ key: k, value: v })) : []
  )
  function parseImagesToColorGroups(images: unknown): ColorGroup[] {
    if (!images || !Array.isArray(images) || images.length === 0) return []
    if (typeof images[0] === "string") {
      return [{ name: "Único", images: images as string[] }]
    }
    const map = new Map<string, string[]>()
    for (const item of images) {
      const img = item as { url: string; color?: string }
      const color = img.color || "Único"
      if (!map.has(color)) map.set(color, [])
      map.get(color)!.push(img.url)
    }
    return Array.from(map.entries()).map(([name, imgs]) => ({ name, images: imgs }))
  }

  const [colorGroups, setColorGroups] = useState<ColorGroup[]>(() =>
    parseImagesToColorGroups(defaultValues?.images)
  )
  const [uploadingForColor, setUploadingForColor] = useState<number | null>(null)
  const [newColorName, setNewColorName] = useState("")
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProductFormData>({
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      costUSDT: "",
      yoniEnabled: false,
      yoniPercentage: "25",
      hasFinancing: false,
      shippingCost: "0",
      profitType: "percentage",
      profitValue: "0",
      stock: "0",
      minStock: "5",
      isAvailable: true,
      isFeatured: false,
      categoryId: "",
      distributorId: "",
      ...defaultValues,
    },
  })

  const watchedName = watch("name")
  const costUSDT = watch("costUSDT")
  const yoniEnabled = watch("yoniEnabled")
  const yoniPercentage = watch("yoniPercentage")
  const shippingCost = watch("shippingCost")
  const profitType = watch("profitType")
  const profitValue = watch("profitValue")

  useEffect(() => {
    fetch("/api/categorias")
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {})

    fetch("/api/distribuidores")
      .then((r) => r.json())
      .then((data) => setDistributors(Array.isArray(data) ? data : []))
      .catch(() => {})

    fetch("/api/configuracion")
      .then((r) => r.json())
      .then((data) => {
        setExchangeRate(Number(data.exchange_rate) || 1)
        setUsdtRate(Number(data.usdt_rate) || Number(data.exchange_rate) || 1)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!productSlug && watchedName) {
      const slug = watchedName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/--+/g, "-")
        .trim()
      setValue("slug", slug)
    }
  }, [watchedName, productSlug, setValue])

  const pricing = useMemo(() => {
    return calculateFinalPrice({
      costUSDT: parseFloat(costUSDT) || 0,
      yoniEnabled: Boolean(yoniEnabled),
      yoniPercentage: parseFloat(yoniPercentage) || 0,
      shippingCost: parseFloat(shippingCost) || 0,
      profitType: (profitType as "percentage" | "fixed_usdt" | "fixed_ars") || "percentage",
      profitValue: parseFloat(profitValue) || 0,
      exchangeRate,
      usdtRate,
    })
  }, [costUSDT, yoniEnabled, yoniPercentage, shippingCost, profitType, profitValue, exchangeRate, usdtRate])

  function addSpec() {
    setSpecs([...specs, { key: "", value: "" }])
  }

  function removeSpec(i: number) {
    setSpecs(specs.filter((_, idx) => idx !== i))
  }

  function updateSpec(i: number, field: "key" | "value", val: string) {
    const updated = [...specs]
    updated[i][field] = val
    setSpecs(updated)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, colorIndex: number) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingForColor(colorIndex)
    const uploaded: string[] = []

    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append("file", file)
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData })
        if (!res.ok) throw new Error("Error al subir imagen")
        const data = await res.json()
        uploaded.push(data.url)
      } catch {
        toast.error(`Error al subir: ${file.name}`)
      }
    }

    setColorGroups(prev => prev.map((g, i) =>
      i === colorIndex ? { ...g, images: [...g.images, ...uploaded] } : g
    ))
    setUploadingForColor(null)
  }

  function removeImage(colorIndex: number, imageIndex: number) {
    setColorGroups(prev => prev.map((g, i) =>
      i === colorIndex ? { ...g, images: g.images.filter((_, j) => j !== imageIndex) } : g
    ))
  }

  async function onSubmit(data: ProductFormData) {
    if (!data.name.trim()) {
      toast.error("El nombre es requerido")
      return
    }
    if (!data.costUSDT || parseFloat(data.costUSDT) <= 0) {
      toast.error("El costo USDT es requerido")
      return
    }

    setSaving(true)

    const specsObj = specs.filter((s) => s.key.trim()).reduce<Record<string, string>>((acc, s) => {
      acc[s.key.trim()] = s.value
      return acc
    }, {})

    const body = {
      ...data,
      costUSDT: parseFloat(data.costUSDT),
      shippingCost: parseFloat(data.shippingCost) || 0,
      profitValue: parseFloat(data.profitValue) || 0,
      yoniPercentage: parseFloat(data.yoniPercentage) || 0,
      hasFinancing: data.hasFinancing ?? false,
      stock: parseInt(data.stock) || 0,
      minStock: parseInt(data.minStock) || 5,
      isAvailable: data.isAvailable ?? true,
      isFeatured: data.isFeatured ?? false,
      categoryId: data.categoryId || null,
      distributorId: data.distributorId || null,
      finalPriceUSD: pricing.finalPriceUSD,
      finalPriceARS: pricing.finalPriceARS,
      exchangeRate,
      images: colorGroups.flatMap(g => g.images.map(url => ({ url, color: g.name }))),
      specs: Object.keys(specsObj).length > 0 ? specsObj : null,
    }

    try {
      const url = productSlug
        ? `/api/productos/${productSlug}`
        : "/api/productos"
      const method = productSlug ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al guardar")
      }

      toast.success(productSlug ? "Producto actualizado" : "Producto creado")
      router.push("/admin/productos")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-3xl">
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-foreground font-heading">Información básica</h2>

        <div className="space-y-2">
          <Label htmlFor="name" className="text-muted-foreground">Nombre</Label>
          <Input id="name" {...register("name", { required: true })} className="bg-muted border-border text-foreground" placeholder="Nombre del producto" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug" className="text-muted-foreground">Slug</Label>
          <Input id="slug" {...register("slug")} className="bg-muted border-border text-foreground" placeholder="se-genera-automaticamente" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-muted-foreground">Descripción</Label>
          <Textarea id="description" {...register("description")} className="bg-muted border-border text-foreground" placeholder="Descripción del producto" rows={4} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-foreground font-heading">Precios y costos (solo admin)</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="costUSDT" className="text-muted-foreground">Costo real USDT *</Label>
            <Input id="costUSDT" type="number" step="0.01" {...register("costUSDT", { required: true })} className="bg-muted border-border text-foreground" placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shippingCost" className="text-muted-foreground">Costo de envío</Label>
            <Input id="shippingCost" type="number" step="0.01" {...register("shippingCost")} className="bg-muted border-border text-foreground/70" placeholder="Se asigna desde importación" />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register("yoniEnabled")} defaultChecked={defaultValues?.yoniEnabled ?? false} className="w-4 h-4 rounded border-zinc-600 bg-muted text-[#22C55E] focus:ring-[#22C55E]" />
            <span className="text-sm text-muted-foreground">Comisión Yoni</span>
          </label>
          {yoniEnabled && (
            <div className="flex items-center gap-2">
              <Input type="number" step="0.1" min="0" max="100" {...register("yoniPercentage")} className="bg-muted border-border text-foreground w-20" placeholder="25" />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register("hasFinancing")} defaultChecked={defaultValues?.hasFinancing ?? false} className="w-4 h-4 rounded border-zinc-600 bg-muted text-[#0071e3] focus:ring-[#0071e3]" />
            <span className="text-sm text-muted-foreground">Financiación (3 o 6 cuotas)</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Tipo de ganancia</Label>
            <Select onValueChange={(v) => { if (v) setValue("profitType", v) }} defaultValue={defaultValues?.profitType || "percentage"}>
              <SelectTrigger className="bg-muted border-border text-foreground">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent className=" bg-popover text-popover-foreground">
                <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                <SelectItem value="fixed_usdt">Valor fijo (USDT)</SelectItem>
                <SelectItem value="fixed_ars">Valor fijo (ARS)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profitValue" className="text-muted-foreground">
              {profitType === "percentage" ? "Ganancia (%)" : profitType === "fixed_usdt" ? "Ganancia fija (USDT)" : "Ganancia fija (ARS)"}
            </Label>
            <Input id="profitValue" type="number" step="0.01" {...register("profitValue")} className="bg-muted border-border text-foreground" placeholder="0" />
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-muted-foreground mb-2">Resumen de precios</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <span className="text-muted-foreground">Costo base USDT:</span>
            <span className="text-right text-muted-foreground">${(parseFloat(costUSDT) || 0).toFixed(2)} USDT</span>
            {yoniEnabled && (
              <>
                <span className="text-muted-foreground">+ Comisión Yoni ({parseFloat(yoniPercentage) || 0}%):</span>
                <span className="text-right text-muted-foreground">${(((parseFloat(costUSDT) || 0) * (parseFloat(yoniPercentage) || 0)) / 100).toFixed(2)} USDT</span>
              </>
            )}
            <span className="text-muted-foreground border-t border-border pt-1">+ Costo envío:</span>
            <span className="text-right text-muted-foreground border-t border-border pt-1">${(parseFloat(shippingCost) || 0).toLocaleString("es-AR")} ARS</span>
            <span className="text-foreground font-semibold border-t border-border pt-1">Subtotal (costo + logística):</span>
            <span className="text-right text-foreground font-semibold border-t border-border pt-1">${pricing.subtotalARS.toLocaleString("es-AR")} ARS</span>
            <span className="text-[#0071e3]">+ Ganancia:</span>
            <span className="text-right text-[#0071e3]">
              {profitType === "percentage"
                ? `${profitValue || 0}% = $${pricing.profitARS.toLocaleString("es-AR")} ARS ($${pricing.profitUSDT.toFixed(2)} USDT)`
                : `$${pricing.profitARS.toLocaleString("es-AR")} ARS ($${pricing.profitUSDT.toFixed(2)} USDT)`}
            </span>
            <span className="text-foreground font-bold border-t border-border pt-1">Precio Final ARS:</span>
            <span className="text-right text-[#22C55E] font-bold border-t border-border pt-1">${pricing.finalPriceARS.toLocaleString("es-AR")} ARS</span>
            <span className="text-foreground font-bold">Precio Final USD (ref):</span>
            <span className="text-right text-[#F59E0B] font-bold">${pricing.finalPriceUSD.toFixed(2)} USD</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="stock" className="text-muted-foreground">Stock</Label>
            <Input id="stock" type="number" {...register("stock")} className="bg-muted border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minStock" className="text-muted-foreground">Stock mínimo</Label>
            <Input id="minStock" type="number" {...register("minStock")} className="bg-muted border-border text-foreground" />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-foreground font-heading">Categoría y distribuidor</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Categoría</Label>
            <Select onValueChange={(v) => { if (v) setValue("categoryId", v === "__none" ? "" : v) }} defaultValue={defaultValues?.categoryId || "none"}>
              <SelectTrigger className="bg-muted border-border text-foreground">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent className=" bg-popover text-popover-foreground">
                <SelectItem value="__none">Sin categoría</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Distribuidor</Label>
            <Select onValueChange={(v) => { if (v) setValue("distributorId", v === "__none" ? "" : v) }} defaultValue={defaultValues?.distributorId || "none"}>
              <SelectTrigger className="bg-muted border-border text-foreground">
                <SelectValue placeholder="Seleccionar distribuidor" />
              </SelectTrigger>
              <SelectContent className=" bg-popover text-popover-foreground">
                <SelectItem value="__none">Sin distribuidor</SelectItem>
                {distributors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register("isAvailable")} defaultChecked={defaultValues?.isAvailable ?? true} className="w-4 h-4 rounded border-zinc-600 bg-muted text-[#22C55E] focus:ring-[#22C55E]" />
            <span className="text-sm text-muted-foreground">Disponible</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register("isFeatured")} defaultChecked={defaultValues?.isFeatured ?? false} className="w-4 h-4 rounded border-zinc-600 bg-muted text-[#F59E0B] focus:ring-[#F59E0B]" />
            <span className="text-sm text-muted-foreground">Destacado</span>
          </label>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground font-heading">Especificaciones</h2>
          <Button type="button" variant="outline" size="sm" onClick={addSpec} className="border-border text-muted-foreground">
            <Plus className="w-4 h-4 mr-1" /> Agregar
          </Button>
        </div>
        {specs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin especificaciones</p>
        ) : (
          <div className="space-y-3">
            {specs.map((spec, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={spec.key} onChange={(e) => updateSpec(i, "key", e.target.value)} placeholder="Clave" className="bg-muted border-border text-foreground flex-1" />
                <Input value={spec.value} onChange={(e) => updateSpec(i, "value", e.target.value)} placeholder="Valor" className="bg-muted border-border text-foreground flex-1" />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeSpec(i)} className="text-red-400 flex-shrink-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-foreground font-heading">Colores e Imágenes</h2>
          <div className="flex items-center gap-2">
            <Input
              value={newColorName}
              onChange={(e) => setNewColorName(e.target.value)}
              placeholder="Nombre del color"
              className="bg-card border-border text-foreground w-36 h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  if (!newColorName.trim()) { toast.error("Ingresá un nombre"); return }
                  setColorGroups([...colorGroups, { name: newColorName.trim(), images: [] }])
                  setNewColorName("")
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (!newColorName.trim()) { toast.error("Ingresá un nombre para el color"); return }
                setColorGroups([...colorGroups, { name: newColorName.trim(), images: [] }])
                setNewColorName("")
              }}
              className="border-border text-muted-foreground flex-shrink-0"
            >
              <Plus className="w-4 h-4 mr-1" /> Color
            </Button>
          </div>
        </div>

        {colorGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin colores. Agregá un color para subir imágenes.</p>
        ) : (
          <div className="space-y-4">
            {colorGroups.map((group, ci) => (
              <div key={ci} className="bg-muted border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{group.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setColorGroups(colorGroups.filter((_, i) => i !== ci))}
                    className="text-red-400 h-7 w-7"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {group.images.map((url, ii) => (
                    <div key={ii} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border group">
                      <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      <button
                        type="button"
                        onClick={() => removeImage(ci, ii)}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  ))}
                  <label className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-[#22C55E] transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                    <span className="text-[10px] text-muted-foreground">{uploadingForColor === ci ? "Subiendo..." : "Subir"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageUpload(e, ci)}
                      className="hidden"
                      disabled={uploadingForColor === ci}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pb-8">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/productos")} className="border-border text-muted-foreground">Cancelar</Button>
        <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px]">
          {saving ? "Guardando..." : productSlug ? "Actualizar producto" : "Crear producto"}
        </Button>
      </div>
    </form>
  )
}
