"use client"

import { useEffect, useState, useCallback } from "react"
import { Ship, Plus, Search, Package } from "lucide-react"
import { toast } from "sonner"
import { formatUSD, formatDate, formatARS } from "@/lib/utils"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-yellow-500/10 text-yellow-400" },
  en_camino: { label: "En camino", className: "bg-blue-500/10 text-blue-400" },
  demorado: { label: "Demorado", className: "bg-orange-500/10 text-orange-400" },
  llego: { label: "Llegó", className: "bg-[#22C55E]/10 text-[#22C55E]" },
  entregado: { label: "Entregado", className: "bg-zinc-500/10 text-zinc-400" },
  cancelado: { label: "Cancelado", className: "bg-red-500/10 text-red-400" },
}

interface OrderItemBrief {
  id: string
  trackingCode: string | null
  shippingStatus: string
  bulkType: string | null
  order: { id: string; clientName: string; clientSurname: string }
  product: { id: string; name: string; slug: string }
}

interface Bulk {
  id: string
  type: string
  courier: string
  trackingCode: string | null
  totalCostUSD: number
  totalCostARS: number | null
  date: string
  status: string
  notes: string | null
  products: { productId: string; name?: string; quantity: number }[]
  orderItems: OrderItemBrief[]
  distributor: { id: string; name: string } | null
}

interface PendingOrderItem {
  id: string
  quantity: number
  priceUSD: number
  product: { id: string; name: string }
  order: { id: string; clientName: string; clientSurname: string }
}

export default function BultosPage() {
  const [bulks, setBulks] = useState<Bulk[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedBulk, setSelectedBulk] = useState<Bulk | null>(null)
  const [pendingItems, setPendingItems] = useState<PendingOrderItem[]>([])
  const [form, setForm] = useState({ type: "grande", courier: "buspack", notes: "" })
  const [editForm, setEditForm] = useState({ trackingCode: "", totalCostARS: "", status: "pending" })
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const fetchBulks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)
      const res = await fetch(`/api/bultos?${params}`)
      const data = await res.json()
      setBulks(Array.isArray(data) ? data : [])
    } catch { toast.error("Error al cargar bultos") }
    finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { fetchBulks() }, [fetchBulks])

  useEffect(() => {
    fetch("/api/pedidos?status=pending")
      .then(r => r.json())
      .then((data) => {
        const items: PendingOrderItem[] = []
        for (const order of Array.isArray(data) ? data : []) {
          for (const item of order.items || []) {
            if (!item.bulkId) {
              items.push({
                id: item.id,
                quantity: item.quantity,
                priceUSD: item.priceUSD,
                product: item.product,
                order: { id: order.id, clientName: order.clientName, clientSurname: order.clientSurname },
              })
            }
          }
        }
        setPendingItems(items)
      })
      .catch(() => {})
  }, [])

  function toggleItem(id: string) {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (selectedItemIds.length === 0) {
      toast.error("Seleccioná al menos un producto")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/bultos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          courier: form.courier,
          orderItemIds: selectedItemIds,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al crear bulto")
      }
      toast.success("Bulto creado")
      setDialogOpen(false)
      setSelectedItemIds([])
      setForm({ type: "grande", courier: "buspack", notes: "" })
      fetchBulks()
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error al crear bulto") }
    finally { setSaving(false) }
  }

  function openEdit(bulk: Bulk) {
    setSelectedBulk(bulk)
    setEditForm({
      trackingCode: bulk.trackingCode || "",
      totalCostARS: bulk.totalCostARS?.toString() || "",
      status: bulk.status,
    })
    setEditDialogOpen(true)
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBulk) return
    setSaving(true)
    try {
      const res = await fetch(`/api/bultos/${selectedBulk.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingCode: editForm.trackingCode || null,
          totalCostARS: editForm.totalCostARS !== "" && editForm.totalCostARS !== undefined ? parseFloat(editForm.totalCostARS) : null,
          status: editForm.status,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al actualizar bulto")
      }
      toast.success("Bulto actualizado")
      setEditDialogOpen(false)
      setSelectedBulk(null)
      fetchBulks()
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error al actualizar bulto") }
    finally { setSaving(false) }
  }

  const filteredPending = form.type === "grande"
    ? pendingItems
    : pendingItems

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">Bultos</h1>
          <p className="text-zinc-400 text-sm mt-1">{bulks.length} bultos</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-[#22C55E] hover:bg-[#16A34A] text-white">
          <Plus className="w-4 h-4 mr-2" /> Nuevo bulto
        </Button>
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "")}>
          <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="Filtrar estado" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400">Fecha</TableHead>
              <TableHead className="text-zinc-400">Tipo</TableHead>
              <TableHead className="text-zinc-400">Courier</TableHead>
              <TableHead className="text-zinc-400 text-right">Productos</TableHead>
              <TableHead className="text-zinc-400 text-right">Tracking</TableHead>
              <TableHead className="text-zinc-400 text-right">Costo total</TableHead>
              <TableHead className="text-zinc-400 text-center">Estado</TableHead>
              <TableHead className="text-zinc-400 text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-zinc-500 py-12">Cargando...</TableCell></TableRow>
            ) : bulks.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-zinc-500 py-12"><Ship className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>Sin bultos</p></TableCell></TableRow>
            ) : (
              bulks.map((b) => {
                const cfg = statusConfig[b.status] || statusConfig.pending
                return (
                  <TableRow key={b.id} className="border-zinc-800/50 hover:bg-white/5">
                    <TableCell className="text-zinc-300">{formatDate(b.date)}</TableCell>
                    <TableCell className="text-zinc-300 capitalize">{b.type === "grande" ? "Grande" : "Chico"}</TableCell>
                    <TableCell className="text-zinc-300 capitalize">{b.courier === "buspack" ? "Buspack" : "Correo Argentino"}</TableCell>
                    <TableCell className="text-right text-zinc-400">{b.orderItems?.length || 0}</TableCell>
                    <TableCell className="text-right text-zinc-400 text-xs">{b.trackingCode || "—"}</TableCell>
                    <TableCell className="text-right text-zinc-200">
                      {b.totalCostARS ? `$${b.totalCostARS.toLocaleString("es-AR")} ARS` : "—"}
                    </TableCell>
                    <TableCell className="text-center"><Badge className={`${cfg.className} border-0`}>{cfg.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(b)} className="text-zinc-400 hover:text-[#22C55E]">
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo bulto</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Courier</Label>
                <Select value={form.courier} onValueChange={(v) => { if (v) setForm({ ...form, courier: v, type: v === "buspack" ? "grande" : "chico" }) }}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                    <SelectItem value="buspack">Buspack</SelectItem>
                    <SelectItem value="correo_argentino">Correo Argentino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Input value={form.type === "grande" ? "Grande" : "Chico"} disabled className="bg-zinc-800 border-zinc-700 text-white/70" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Productos pendientes</Label>
              <div className="max-h-48 overflow-y-auto space-y-1 bg-zinc-800/30 rounded-lg p-2">
                {filteredPending.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItemIds.includes(item.id)}
                      onChange={() => toggleItem(item.id)}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-[#22C55E]"
                    />
                    <span className="text-sm text-zinc-300 flex-1">{item.product.name}</span>
                    <span className="text-xs text-zinc-500">
                      {item.order.clientName} {item.order.clientSurname}
                    </span>
                  </label>
                ))}
                {filteredPending.length === 0 && (
                  <p className="text-sm text-zinc-500 text-center py-4">No hay productos pendientes</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-zinc-400">Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-[#22C55E] hover:bg-[#16A34A] text-white">
                {saving ? "Guardando..." : "Crear bulto"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg">
          <DialogHeader><DialogTitle>Editar bulto</DialogTitle></DialogHeader>
          {selectedBulk && (
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-zinc-500">Tipo</p><p className="text-white capitalize">{selectedBulk.type === "grande" ? "Grande" : "Chico"}</p></div>
                <div><p className="text-zinc-500">Courier</p><p className="text-white capitalize">{selectedBulk.courier === "buspack" ? "Buspack" : "Correo Argentino"}</p></div>
              </div>
              <div className="space-y-2">
                <Label>Código de seguimiento</Label>
                <Input
                  value={editForm.trackingCode}
                  onChange={(e) => setEditForm({ ...editForm, trackingCode: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="Ingresar tracking"
                />
              </div>
              <div className="space-y-2">
                <Label>Costo total ARS</Label>
                <Input
                  type="number"
                  value={editForm.totalCostARS}
                  onChange={(e) => setEditForm({ ...editForm, totalCostARS: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={editForm.status} onValueChange={(v) => { if (v) setEditForm({ ...editForm, status: v }) }}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                    {Object.entries(statusConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedBulk.orderItems.length > 0 && (
                <div>
                  <p className="text-sm text-zinc-500 mb-2">Productos en este bulto</p>
                  {selectedBulk.orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm py-1 border-b border-zinc-800 last:border-0">
                      <span className="text-zinc-300">{item.product.name}</span>
                      <span className="text-zinc-500 text-xs">
                        {item.order.clientName} {item.order.clientSurname}
                        {item.trackingCode && ` | ${item.trackingCode}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)} className="text-zinc-400">Cancelar</Button>
                <Button type="submit" disabled={saving} className="bg-[#22C55E] hover:bg-[#16A34A] text-white">
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
