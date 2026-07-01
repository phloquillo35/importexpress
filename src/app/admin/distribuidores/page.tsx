"use client"

import { useEffect, useState } from "react"
import { Truck, Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
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

interface Distributor {
  id: string
  name: string
  contact: string | null
  website: string | null
  notes: string | null
  createdAt: string
}

export default function DistribuidoresPage() {
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Distributor | null>(null)
  const [form, setForm] = useState({ name: "", contact: "", website: "", notes: "" })
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const res = await fetch("/api/distribuidores")
      const data = await res.json()
      setDistributors(Array.isArray(data) ? data : [])
    } catch { toast.error("Error al cargar") }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setForm({ name: "", contact: "", website: "", notes: "" })
    setDialogOpen(true)
  }

  function openEdit(d: Distributor) {
    setEditing(d)
    setForm({ name: d.name, contact: d.contact || "", website: d.website || "", notes: d.notes || "" })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error("El nombre es requerido"); return }
    setSaving(true)
    try {
      if (editing) {
        const res = await fetch(`/api/distribuidores/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        if (!res.ok) throw new Error()
        toast.success("Distribuidor actualizado")
      } else {
        const res = await fetch("/api/distribuidores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        if (!res.ok) throw new Error()
        toast.success("Distribuidor creado")
      }
      setDialogOpen(false)
      load()
    } catch { toast.error("Error al guardar") }
    finally { setSaving(false) }
  }

  async function handleDelete(d: Distributor) {
    if (!confirm(`¿Eliminar "${d.name}"?`)) return
    try {
      const res = await fetch(`/api/distribuidores/${d.id}`, { method: "DELETE" })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      toast.success("Distribuidor eliminado")
      load()
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error al eliminar") }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1d1d1f] font-heading">Distribuidores</h1>
          <p className="text-[#6e6e73] text-sm mt-1">{distributors.length} distribuidores</p>
        </div>
        <Button onClick={openNew} className="bg-[#0071e3] hover:bg-[#0077ed] text-white">
          <Plus className="w-4 h-4 mr-2" /> Nuevo distribuidor
        </Button>
      </div>

      <div className="bg-white border border-[#d2d2d7]/60 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-[#d2d2d7]/60 hover:bg-transparent">
              <TableHead className="text-[#6e6e73]">Nombre</TableHead>
              <TableHead className="text-[#6e6e73] hidden md:table-cell">Contacto</TableHead>
              <TableHead className="text-[#6e6e73] hidden lg:table-cell">Web</TableHead>
              <TableHead className="text-[#6e6e73] hidden sm:table-cell">Creado</TableHead>
              <TableHead className="text-[#6e6e73] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-[#6e6e73] py-12">Cargando...</TableCell></TableRow>
            ) : distributors.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-[#6e6e73] py-12"><Truck className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>Sin distribuidores</p></TableCell></TableRow>
            ) : (
              distributors.map((d) => (
                <TableRow key={d.id} className="border-[#d2d2d7]/60 hover:bg-[#f5f5f7]">
                  <TableCell className="font-medium text-[#1d1d1f]">{d.name}</TableCell>
                  <TableCell className="text-[#6e6e73] hidden md:table-cell">{d.contact || "—"}</TableCell>
                  <TableCell className="text-[#6e6e73] hidden lg:table-cell">{d.website || "—"}</TableCell>
                  <TableCell className="text-[#6e6e73] text-sm hidden sm:table-cell">{formatDate(d.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)} className="text-[#6e6e73] hover:text-[#22C55E]"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(d)} className="text-[#6e6e73] hover:text-red-400"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-[#d2d2d7]/60 text-[#1d1d1f]">
          <DialogHeader><DialogTitle>{editing ? "Editar distribuidor" : "Nuevo distribuidor"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-[#f5f5f7] border-[#d2d2d7]/60 text-[#1d1d1f]" />
            </div>
            <div className="space-y-2">
              <Label>Contacto</Label>
              <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="bg-[#f5f5f7] border-[#d2d2d7]/60 text-[#1d1d1f]" placeholder="Teléfono o email" />
            </div>
            <div className="space-y-2">
              <Label>Sitio web</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="bg-[#f5f5f7] border-[#d2d2d7]/60 text-[#1d1d1f]" placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-[#f5f5f7] border-[#d2d2d7]/60 text-[#1d1d1f]" rows={3} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-[#6e6e73]">Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-[#0071e3] hover:bg-[#0077ed] text-white">{saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
