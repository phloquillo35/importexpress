"use client"

import { useEffect, useState, useCallback } from "react"
import { Ship, Plus, Search, Package, Eye, Trash2 } from "lucide-react"
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


const statusConfig: Record<string, { label: string; className: string; dot: string }> = {
  pending: { label: "Pendiente", className: "bg-yellow-500/10 text-yellow-400", dot: "bg-yellow-400" },
  en_camino: { label: "En camino", className: "bg-blue-500/10 text-blue-400", dot: "bg-blue-400" },
  demorado: { label: "Demorado", className: "bg-orange-500/10 text-orange-400", dot: "bg-orange-400" },
  llego: { label: "Llegó", className: "bg-[#22C55E]/10 text-[#22C55E]", dot: "bg-[#22C55E]" },
  entregado: { label: "Entregado", className: "bg-zinc-500/10 text-muted-foreground", dot: "bg-zinc-400" },
  cancelado: { label: "Cancelado", className: "bg-red-500/10 text-red-400", dot: "bg-red-400" },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.pending
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
      <span className={`text-xs ${cfg.className.split(" ").find(c => c.startsWith("text-"))}`}>{cfg.label}</span>
    </span>
  )
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
  const [viewBulk, setViewBulk] = useState<Bulk | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Bulk | null>(null)

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

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      const res = await fetch(`/api/bultos/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al eliminar bulto")
      }
      toast.success("Bulto eliminado")
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
      fetchBulks()
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error al eliminar bulto") }
    finally { setSaving(false) }
  }

  async function openView(bulk: Bulk) {
    setViewBulk(bulk)
    setViewLoading(true)
    try {
      const res = await fetch(`/api/bultos/${bulk.id}`)
      const data = await res.json()
      setViewBulk(data)
    } catch {
      toast.error("Error al cargar bulto")
    } finally {
      setViewLoading(false)
    }
  }

  const filteredPending = form.type === "grande"
    ? pendingItems
    : pendingItems

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Bultos</h1>
          <p className="text-muted-foreground text-sm mt-1">{bulks.length} bultos</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Nuevo bulto
        </Button>
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v || "")}>
          <SelectTrigger className="w-40 bg-muted border-border text-foreground">
            <SelectValue placeholder="Filtrar estado">{(value) => !value ? "Filtrar estado" : statusConfig[value]?.label || value}</SelectValue>
          </SelectTrigger>
          <SelectContent className=" bg-card text-foreground">
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Fecha</TableHead>
              <TableHead className="text-muted-foreground">Tipo</TableHead>
              <TableHead className="text-muted-foreground">Courier</TableHead>
              <TableHead className="text-muted-foreground text-right">Productos</TableHead>
              <TableHead className="text-muted-foreground text-right">Seguimiento</TableHead>
              <TableHead className="text-muted-foreground text-right">Costo total</TableHead>
              <TableHead className="text-muted-foreground text-center">Estado</TableHead>
              <TableHead className="text-muted-foreground text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">Cargando...</TableCell></TableRow>
            ) : bulks.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12"><Ship className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>Sin bultos</p></TableCell></TableRow>
            ) : (
              bulks.map((b) => {
                const cfg = statusConfig[b.status] || statusConfig.pending
                return (
                  <TableRow key={b.id} className="border-border hover:bg-muted">
                    <TableCell className="text-muted-foreground">{formatDate(b.date)}</TableCell>
                    <TableCell className="text-muted-foreground capitalize">{b.type === "grande" ? "Grande" : "Chico"}</TableCell>
                    <TableCell className="text-muted-foreground capitalize">{b.courier === "buspack" ? "Buspack" : "Correo Argentino"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{b.orderItems?.length || 0}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">{b.trackingCode || "—"}</TableCell>
                    <TableCell className="text-right text-foreground">
                      {b.totalCostARS ? `$${b.totalCostARS.toLocaleString("es-AR")} ARS` : "—"}
                    </TableCell>
                    <TableCell className="text-center"><StatusBadge status={b.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openView(b)} className="text-muted-foreground hover:text-blue-400">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(b)} className="text-muted-foreground hover:text-[#22C55E]">
                          Editar
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setDeleteTarget(b); setDeleteDialogOpen(true) }} className="text-muted-foreground hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className=" bg-card text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo bulto</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Courier</Label>
                <Select value={form.courier} onValueChange={(v) => { if (v) setForm({ ...form, courier: v, type: v === "buspack" ? "grande" : "chico" }) }}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue>{(value) => !value ? "Seleccionar" : value === "buspack" ? "Buspack" : "Correo Argentino"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className=" bg-card text-foreground">
                    <SelectItem value="buspack">Buspack</SelectItem>
                    <SelectItem value="correo_argentino">Correo Argentino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Input value={form.type === "grande" ? "Grande" : "Chico"} disabled className="bg-muted border-border text-foreground/70" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Productos pendientes</Label>
              <div className="max-h-48 overflow-y-auto space-y-1 bg-muted/30 rounded-lg p-2">
                {filteredPending.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItemIds.includes(item.id)}
                      onChange={() => toggleItem(item.id)}
                      className="w-4 h-4 rounded border-zinc-600 bg-muted text-[#22C55E]"
                    />
                    <span className="text-sm text-muted-foreground flex-1">{item.product.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.order.clientName} {item.order.clientSurname}
                    </span>
                  </label>
                ))}
                {filteredPending.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay productos pendientes</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {saving ? "Guardando..." : "Crear bulto"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className=" bg-card text-foreground max-w-lg">
          <DialogHeader><DialogTitle>Editar bulto</DialogTitle></DialogHeader>
          {selectedBulk && (
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Tipo</p><p className="text-foreground capitalize">{selectedBulk.type === "grande" ? "Grande" : "Chico"}</p></div>
                <div><p className="text-muted-foreground">Courier</p><p className="text-foreground capitalize">{selectedBulk.courier === "buspack" ? "Buspack" : "Correo Argentino"}</p></div>
              </div>
              <div className="space-y-2">
                <Label>Código de seguimiento</Label>
                <Input
                  value={editForm.trackingCode}
                  onChange={(e) => setEditForm({ ...editForm, trackingCode: e.target.value })}
                  className="bg-muted border-border text-foreground"
                  placeholder="Ingresar tracking"
                />
              </div>
              <div className="space-y-2">
                <Label>Costo total ARS</Label>
                <Input
                  type="number"
                  value={editForm.totalCostARS}
                  onChange={(e) => setEditForm({ ...editForm, totalCostARS: e.target.value })}
                  className="bg-muted border-border text-foreground"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={editForm.status} onValueChange={(v) => { if (v) setEditForm({ ...editForm, status: v }) }}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue>{(value) => !value ? "Seleccionar" : statusConfig[value]?.label || value}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className=" bg-card text-foreground">
                    {Object.entries(statusConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedBulk.orderItems.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Productos en este bulto</p>
                  {selectedBulk.orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                      <span className="text-muted-foreground">{item.product.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {item.order.clientName} {item.order.clientSurname}
                        {item.trackingCode && ` | ${item.trackingCode}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)} className="text-muted-foreground">Cancelar</Button>
                <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewBulk} onOpenChange={(o) => { if (!o) setViewBulk(null) }}>
        <DialogContent className="bg-card text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulto — {viewBulk?.type === "grande" ? "Grande" : "Chico"} — {viewBulk?.courier === "buspack" ? "Buspack" : "Correo Argentino"}</DialogTitle>
          </DialogHeader>
          {viewLoading ? (
            <div className="text-center text-muted-foreground py-12">Cargando bulto...</div>
          ) : !viewBulk ? (
            <div className="text-center text-muted-foreground py-12">
              <Ship className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Bulto no encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Fecha</p>
                  <p className="text-foreground">{formatDate(viewBulk.date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estado</p>
                  <StatusBadge status={viewBulk.status} />
                </div>
                <div>
                  <p className="text-muted-foreground">Código de seguimiento</p>
                  <p className="text-foreground">{viewBulk.trackingCode || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Costo total ARS</p>
                  <p className="text-foreground">{viewBulk.totalCostARS ? `$${viewBulk.totalCostARS.toLocaleString("es-AR")}` : "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Costo total USD</p>
                  <p className="text-foreground">${viewBulk.totalCostUSD.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Productos</p>
                  <p className="text-foreground">{viewBulk.orderItems?.length || 0}</p>
                </div>
              </div>

              {(viewBulk.orderItems?.length || 0) > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Productos en este bulto</p>
                  <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground">Producto</TableHead>
                          <TableHead className="text-muted-foreground">Cliente</TableHead>
                          <TableHead className="text-muted-foreground">Seguimiento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewBulk.orderItems.map((item) => (
                          <TableRow key={item.id} className="border-border hover:bg-muted">
                            <TableCell className="font-medium text-foreground">{item.product.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.order.clientName} {item.order.clientSurname}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">{item.trackingCode || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {viewBulk.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notas</p>
                  <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">{viewBulk.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={(o) => { if (!o) { setDeleteDialogOpen(false); setDeleteTarget(null) } }}>
        <DialogContent className="bg-card text-foreground max-w-sm">
          <DialogHeader><DialogTitle>Eliminar bulto</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Eliminar este bulto? Los productos se desvincularán y volverán a estado pendiente.
          </p>
          {deleteTarget && (
            <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 space-y-1">
              <p><span className="text-foreground">Tipo:</span> {deleteTarget.type === "grande" ? "Grande" : "Chico"}</p>
              <p><span className="text-foreground">Courier:</span> {deleteTarget.courier === "buspack" ? "Buspack" : "Correo Argentino"}</p>
              {deleteTarget.trackingCode && <p><span className="text-foreground">Tracking:</span> {deleteTarget.trackingCode}</p>}
              <p><span className="text-foreground">Productos:</span> {deleteTarget.orderItems?.length || 0}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setDeleteDialogOpen(false); setDeleteTarget(null) }} className="text-muted-foreground">Cancelar</Button>
            <Button type="button" disabled={saving} onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
              {saving ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
