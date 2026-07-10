"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, Tags, X, Eye, Package } from "lucide-react"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDate, formatUSD } from "@/lib/utils"

interface Subcategory {
  id: string
  name: string
  slug: string
}

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: string
  _count: { products: number }
  children: Subcategory[]
  parent: Subcategory | null
}

interface ViewProduct {
  id: string
  slug: string
  name: string
  priceUSD: number
  finalPriceARS: number
  stock: number
  isAvailable: boolean
}

export default function AdminCategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: "", slug: "", description: "" })
  const [showSubcategories, setShowSubcategories] = useState(false)
  const [subcatInputs, setSubcatInputs] = useState<string[]>([""])
  const [saving, setSaving] = useState(false)
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null)
  const [categoryProducts, setCategoryProducts] = useState<ViewProduct[]>([])
  const [viewLoading, setViewLoading] = useState(false)

  async function loadCategories() {
    try {
      const res = await fetch("/api/categorias")
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Error al cargar categorías")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  function openNew() {
    setEditing(null)
    setForm({ name: "", slug: "", description: "" })
    setShowSubcategories(false)
    setSubcatInputs([""])
    setDialogOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setForm({ name: cat.name, slug: cat.slug, description: cat.description || "" })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("El nombre es requerido")
      return
    }

    setSaving(true)
    try {
      if (editing) {
        const res = await fetch(`/api/categorias/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error)
        }
        toast.success("Categoría actualizada")
      } else {
        const body: Record<string, unknown> = { ...form }
        if (showSubcategories) {
          const subs = subcatInputs.map(s => s.trim()).filter(Boolean)
          if (subs.length > 0) body.subcategories = subs
        }
        const res = await fetch("/api/categorias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error)
        }
        toast.success("Categoría creada")
      }
      setDialogOpen(false)
      loadCategories()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`¿Eliminar "${cat.name}"?`)) return
    try {
      const res = await fetch(`/api/categorias/${cat.id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      toast.success("Categoría eliminada")
      loadCategories()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar")
    }
  }

  async function openView(cat: Category) {
    setViewingCategory(cat)
    setViewLoading(true)
    setCategoryProducts([])
    try {
      const res = await fetch(`/api/productos?categoriaId=${cat.id}&admin=1&limit=100`)
      const data = await res.json()
      setCategoryProducts(data.products || [])
    } catch {
      toast.error("Error al cargar productos")
    } finally {
      setViewLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Categorías</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestioná las categorías de productos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Button onClick={openNew} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Nueva categoría
          </Button>
          <DialogContent className="bg-popover border-border text-foreground">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            </DialogHeader>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => {
                    const val = e.target.value
                    setForm((prev) => ({ ...prev, name: val, slug: !editing ? val.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "") : prev.slug }))
                  }}
                  className="bg-muted border-border text-foreground"
                  placeholder="Nombre de la categoría"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="bg-muted border-border text-foreground"
                  placeholder="categoria-slug"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="bg-muted border-border text-foreground"
                  placeholder="Descripción opcional"
                  rows={3}
                />
              </div>
              {!editing && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowSubcategories(!showSubcategories)
                      if (!showSubcategories) setSubcatInputs([""])
                    }}
                    className="border-border text-muted-foreground"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {showSubcategories ? "Ocultar subcategorías" : "Agregar subcategorías"}
                  </Button>

                  {showSubcategories && (
                    <div className="space-y-2 border border-border rounded-lg p-4 bg-muted/30">
                      <Label className="text-muted-foreground text-sm font-medium">Subcategorías</Label>
                      {subcatInputs.map((val, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            value={val}
                            onChange={(e) => {
                              const updated = [...subcatInputs]
                              updated[i] = e.target.value
                              setSubcatInputs(updated)
                            }}
                            className="bg-muted border-border text-foreground flex-1"
                            placeholder="Nombre de la subcategoría"
                          />
                          {subcatInputs.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => setSubcatInputs(subcatInputs.filter((_, j) => j !== i))} className="text-red-400 flex-shrink-0">
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => setSubcatInputs([...subcatInputs, ""])} className="border-border text-muted-foreground">
                        <Plus className="w-4 h-4 mr-1" /> Agregar otra
                      </Button>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">
                  Cancelar
                </Button>
                <button type="button" disabled={saving} onClick={handleSubmit} className="bg-primary hover:bg-primary/90 text-primary-foreground inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50">
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear categoría"}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Nombre</TableHead>
              <TableHead className="text-muted-foreground">Slug</TableHead>
              <TableHead className="text-muted-foreground">Descripción</TableHead>
              <TableHead className="text-muted-foreground">Subcategorías</TableHead>
              <TableHead className="text-muted-foreground text-center">Productos</TableHead>
              <TableHead className="text-muted-foreground">Creada</TableHead>
              <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  <Tags className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No hay categorías</p>
                </TableCell>
              </TableRow>
            ) : (
              categories.map((cat) => (
                <TableRow key={cat.id} className="border-border hover:bg-muted">
                  <TableCell className="font-medium text-foreground">{cat.name}</TableCell>
                  <TableCell className="text-muted-foreground">{cat.slug}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {cat.description || "—"}
                  </TableCell>
                  <TableCell>
                    {cat.parent ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        ← {cat.parent.name}
                      </span>
                    ) : cat.children.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {cat.children.map((child) => (
                          <span key={child.id} className="inline-flex items-center text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {child.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">{cat._count.products}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(cat.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openView(cat)}
                        className="text-muted-foreground hover:text-blue-400"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(cat)}
                        className="text-muted-foreground hover:text-[#22C55E]"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(cat)}
                        className="text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!viewingCategory} onOpenChange={(o) => { if (!o) setViewingCategory(null) }}>
        <DialogContent className="bg-popover border-border text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingCategory?.name} — Productos</DialogTitle>
          </DialogHeader>
          {viewLoading ? (
            <div className="text-center text-muted-foreground py-12">Cargando productos...</div>
          ) : categoryProducts.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No hay productos en esta categoría</p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Nombre</TableHead>
                    <TableHead className="text-muted-foreground text-right">Precio USD</TableHead>
                    <TableHead className="text-muted-foreground text-right">Final ARS</TableHead>
                    <TableHead className="text-muted-foreground text-center">Stock</TableHead>
                    <TableHead className="text-muted-foreground text-center">Disponible</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryProducts.map((p) => (
                    <TableRow key={p.id} className="border-border hover:bg-muted">
                      <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatUSD(p.priceUSD)}</TableCell>
                      <TableCell className="text-right text-foreground">${p.finalPriceARS.toLocaleString("es-AR")}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{p.stock}</TableCell>
                      <TableCell className="text-center">
                        {p.isAvailable ? (
                          <span className="text-[#22C55E] text-xs">Sí</span>
                        ) : (
                          <span className="text-red-400 text-xs">No</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
