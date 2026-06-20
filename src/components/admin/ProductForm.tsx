"use client"

import { useEffect, useState } from "react"
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

interface ProductFormData {
  name: string
  slug: string
  description: string
  priceUSD: string
  costUSD: string
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

interface ProductFormProps {
  defaultValues?: Partial<ProductFormData> & { images?: string[]; specs?: Record<string, string> }
  productSlug?: string
}

export function ProductForm({ defaultValues, productSlug }: ProductFormProps) {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>(
    defaultValues?.specs ? Object.entries(defaultValues.specs).map(([k, v]) => ({ key: k, value: v })) : []
  )
  const [images, setImages] = useState<string[]>(defaultValues?.images || [])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProductFormData>({
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      priceUSD: "",
      costUSD: "",
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

  useEffect(() => {
    fetch("/api/categorias")
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {})

    fetch("/api/distribuidores")
      .then((r) => r.json())
      .then((data) => setDistributors(Array.isArray(data) ? data : []))
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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
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

    setImages([...images, ...uploaded])
    setUploading(false)
    e.target.value = ""
  }

  function removeImage(idx: number) {
    setImages(images.filter((_, i) => i !== idx))
  }

  async function onSubmit(data: ProductFormData) {
    if (!data.name.trim()) {
      toast.error("El nombre es requerido")
      return
    }
    if (!data.priceUSD || parseFloat(data.priceUSD) <= 0) {
      toast.error("El precio USD debe ser mayor a 0")
      return
    }

    setSaving(true)

    const specsObj = specs.filter((s) => s.key.trim()).reduce<Record<string, string>>((acc, s) => {
      acc[s.key.trim()] = s.value
      return acc
    }, {})

    const body = {
      ...data,
      priceUSD: parseFloat(data.priceUSD),
      costUSD: data.costUSD ? parseFloat(data.costUSD) : null,
      stock: parseInt(data.stock) || 0,
      minStock: parseInt(data.minStock) || 5,
      isAvailable: data.isAvailable ?? true,
      isFeatured: data.isFeatured ?? false,
      categoryId: data.categoryId || null,
      distributorId: data.distributorId || null,
      images,
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
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white font-heading">Información básica</h2>

        <div className="space-y-2">
          <Label htmlFor="name" className="text-zinc-300">Nombre</Label>
          <Input
            id="name"
            {...register("name", { required: true })}
            className="bg-zinc-800 border-zinc-700 text-white"
            placeholder="Nombre del producto"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug" className="text-zinc-300">Slug</Label>
          <Input
            id="slug"
            {...register("slug")}
            className="bg-zinc-800 border-zinc-700 text-white"
            placeholder="se-genera-automaticamente"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-zinc-300">Descripción</Label>
          <Textarea
            id="description"
            {...register("description")}
            className="bg-zinc-800 border-zinc-700 text-white"
            placeholder="Descripción del producto"
            rows={4}
          />
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white font-heading">Precios y stock</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="priceUSD" className="text-zinc-300">Precio USD *</Label>
            <Input
              id="priceUSD"
              type="number"
              step="0.01"
              {...register("priceUSD", { required: true })}
              className="bg-zinc-800 border-zinc-700 text-white"
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="costUSD" className="text-zinc-300">Costo USD</Label>
            <Input
              id="costUSD"
              type="number"
              step="0.01"
              {...register("costUSD")}
              className="bg-zinc-800 border-zinc-700 text-white"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="stock" className="text-zinc-300">Stock</Label>
            <Input
              id="stock"
              type="number"
              {...register("stock")}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minStock" className="text-zinc-300">Stock mínimo</Label>
            <Input
              id="minStock"
              type="number"
              {...register("minStock")}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white font-heading">Categoría y distribuidor</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="categoryId" className="text-zinc-300">Categoría</Label>
            <Select onValueChange={(v) => setValue("categoryId", v === "__none" || v === null ? "" : v)} defaultValue={defaultValues?.categoryId || ""}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                <SelectItem value="__none">Sin categoría</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="distributorId" className="text-zinc-300">Distribuidor</Label>
            <Select onValueChange={(v) => setValue("distributorId", v === "__none" || v === null ? "" : v)} defaultValue={defaultValues?.distributorId || ""}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Seleccionar distribuidor" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
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
            <input
              type="checkbox"
              {...register("isAvailable")}
              defaultChecked={defaultValues?.isAvailable ?? true}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-[#22C55E] focus:ring-[#22C55E]"
            />
            <span className="text-sm text-zinc-300">Disponible</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register("isFeatured")}
              defaultChecked={defaultValues?.isFeatured ?? false}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-[#F59E0B] focus:ring-[#F59E0B]"
            />
            <span className="text-sm text-zinc-300">Destacado</span>
          </label>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white font-heading">Especificaciones</h2>
          <Button type="button" variant="outline" size="sm" onClick={addSpec} className="border-zinc-700 text-zinc-300">
            <Plus className="w-4 h-4 mr-1" />
            Agregar
          </Button>
        </div>
        {specs.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin especificaciones</p>
        ) : (
          <div className="space-y-3">
            {specs.map((spec, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={spec.key}
                  onChange={(e) => updateSpec(i, "key", e.target.value)}
                  placeholder="Clave"
                  className="bg-zinc-800 border-zinc-700 text-white flex-1"
                />
                <Input
                  value={spec.value}
                  onChange={(e) => updateSpec(i, "value", e.target.value)}
                  placeholder="Valor"
                  className="bg-zinc-800 border-zinc-700 text-white flex-1"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeSpec(i)} className="text-red-400 flex-shrink-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white font-heading">Imágenes</h2>

        <div className="flex flex-wrap gap-3">
          {images.map((url, i) => (
            <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-zinc-700 group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          ))}
          <label className="w-24 h-24 rounded-lg border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:border-[#22C55E] transition-colors">
            <Upload className="w-5 h-5 text-zinc-500 mb-1" />
            <span className="text-[10px] text-zinc-500">{uploading ? "Subiendo..." : "Subir"}</span>
            <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pb-8">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/productos")}
          className="border-zinc-700 text-zinc-400"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="bg-[#22C55E] hover:bg-[#16A34A] text-white min-w-[140px]"
        >
          {saving ? "Guardando..." : productSlug ? "Actualizar producto" : "Crear producto"}
        </Button>
      </div>
    </form>
  )
}
