"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, Tags } from "lucide-react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { formatDate } from "@/lib/utils"

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: string
  _count: { products: number }
}

export default function AdminCategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: "", slug: "", description: "" })

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
    setDialogOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setForm({ name: cat.name, slug: cat.slug, description: cat.description || "" })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("El nombre es requerido")
      return
    }

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
        const res = await fetch("/api/categorias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">Categorías</h1>
          <p className="text-zinc-400 text-sm mt-1">Gestioná las categorías de productos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Button onClick={openNew} className="bg-[#22C55E] hover:bg-[#16A34A] text-white">
            <Plus className="w-4 h-4 mr-2" />
            Nueva categoría
          </Button>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value })
                    if (!editing) setForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "") }))
                  }}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="Nombre de la categoría"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="categoria-slug"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="Descripción opcional"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-zinc-400">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#22C55E] hover:bg-[#16A34A] text-white">
                  {editing ? "Guardar cambios" : "Crear categoría"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400">Nombre</TableHead>
              <TableHead className="text-zinc-400 hidden md:table-cell">Slug</TableHead>
              <TableHead className="text-zinc-400 hidden lg:table-cell">Descripción</TableHead>
              <TableHead className="text-zinc-400 text-center">Productos</TableHead>
              <TableHead className="text-zinc-400 hidden sm:table-cell">Creada</TableHead>
              <TableHead className="text-zinc-400 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-zinc-500 py-12">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-zinc-500 py-12">
                  <Tags className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No hay categorías</p>
                </TableCell>
              </TableRow>
            ) : (
              categories.map((cat) => (
                <TableRow key={cat.id} className="border-zinc-800/50 hover:bg-white/5">
                  <TableCell className="font-medium text-white">{cat.name}</TableCell>
                  <TableCell className="text-zinc-400 hidden md:table-cell">{cat.slug}</TableCell>
                  <TableCell className="text-zinc-400 hidden lg:table-cell max-w-[200px] truncate">
                    {cat.description || "—"}
                  </TableCell>
                  <TableCell className="text-center text-zinc-300">{cat._count.products}</TableCell>
                  <TableCell className="text-zinc-500 text-sm hidden sm:table-cell">
                    {formatDate(cat.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(cat)}
                        className="text-zinc-400 hover:text-[#22C55E]"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(cat)}
                        className="text-zinc-400 hover:text-red-400"
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
    </div>
  )
}
