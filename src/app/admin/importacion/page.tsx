"use client"

import { useEffect, useState, useCallback } from "react"
import { Ship, Plus, Search, Package } from "lucide-react"
import { toast } from "sonner"
import { formatUSD, formatDate } from "@/lib/utils"
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
  in_transit: { label: "En tránsito", className: "bg-blue-500/10 text-blue-400" },
  received: { label: "Recibido", className: "bg-[#22C55E]/10 text-[#22C55E]" },
  cancelled: { label: "Cancelado", className: "bg-red-500/10 text-red-400" },
}

interface Batch {
  id: string
  date: string
  distributor: { id: string; name: string } | null
  products: { productId: string; name?: string; quantity: number }[]
  totalCostUSD: number
  status: string
  notes: string | null
}

interface Product {
  id: string
  name: string
}

interface Distributor {
  id: string
  name: string
}

export default function ImportacionPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [searchProd, setSearchProd] = useState("")
  const [cart, setCart] = useState<{ productId: string; name: string; quantity: number }[]>([])
  const [form, setForm] = useState({ distributorId: "", totalCostUSD: "", notes: "" })
  const [saving, setSaving] = useState(false)

  const fetchBatches = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)
      const res = await fetch(`/api/importacion?${params}`)
      const data = await res.json()
      setBatches(Array.isArray(data) ? data : [])
    } catch { toast.error("Error al cargar") }
    finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { fetchBatches() }, [fetchBatches])
  useEffect(() => {
    fetch("/api/productos?limit=200").then(r => r.json()).then(d => setProducts(d.products || [])).catch(() => toast.error("Error al cargar productos"))
    fetch("/api/distribuidores").then(r => r.json()).then(d => setDistributors(Array.isArray(d) ? d : [])).catch(() => toast.error("Error al cargar distribuidores"))
  }, [])

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchProd.toLowerCase()))

  function addProduct(product: Product) {
    const existing = cart.find(c => c.productId === product.id)
    if (existing) setCart(cart.map(c => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c))
    else setCart([...cart, { productId: product.id, name: product.name, quantity: 1 }])
  }

  const totalCost = parseFloat(form.totalCostUSD) || 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (cart.length === 0) { toast.error("Agregá al menos un producto"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/importacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distributorId: form.distributorId || null,
          products: cart.map(c => ({ productId: c.productId, name: c.name, quantity: c.quantity })),
          totalCostUSD: parseFloat(form.totalCostUSD) || 0,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al crear lote")
      }
      toast.success("Lote creado")
      setDialogOpen(false)
      setCart([])
      setForm({ distributorId: "", totalCostUSD: "", notes: "" })
      fetchBatches()
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error al crear lote") }
    finally { setSaving(false) }
  }

  async function updateStatus(batchId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/importacion/${batchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al actualizar")
      }
      toast.success(newStatus === "received" ? "Stock actualizado automáticamente" : "Estado actualizado")
      fetchBatches()
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error al actualizar") }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">Importación</h1>
          <p className="text-zinc-400 text-sm mt-1">Lotes de importación</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-[#22C55E] hover:bg-[#16A34A] text-white">
          <Plus className="w-4 h-4 mr-2" /> Nuevo lote
        </Button>
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "")}>
          <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="Filtrar" />
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
              <TableHead className="text-zinc-400">Distribuidor</TableHead>
              <TableHead className="text-zinc-400 text-right">Productos</TableHead>
              <TableHead className="text-zinc-400 text-right">Costo</TableHead>
              <TableHead className="text-zinc-400 text-center">Estado</TableHead>
              <TableHead className="text-zinc-400 text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-zinc-500 py-12">Cargando...</TableCell></TableRow>
            ) : batches.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-zinc-500 py-12"><Ship className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>Sin lotes</p></TableCell></TableRow>
            ) : (
              batches.map((b) => {
                const cfg = statusConfig[b.status] || statusConfig.pending
                return (
                  <TableRow key={b.id} className="border-zinc-800/50 hover:bg-white/5">
                    <TableCell className="text-zinc-300">{formatDate(b.date)}</TableCell>
                    <TableCell className="text-zinc-300">{b.distributor?.name || "—"}</TableCell>
                    <TableCell className="text-right text-zinc-400">{Array.isArray(b.products) ? b.products.length : 0}</TableCell>
                    <TableCell className="text-right text-zinc-200">{formatUSD(b.totalCostUSD)}</TableCell>
                    <TableCell className="text-center"><Badge className={`${cfg.className} border-0`}>{cfg.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Select onValueChange={(v: any) => updateStatus(b.id, v || "pending")}>
                        <SelectTrigger className="w-28 h-7 text-xs bg-zinc-800 border-zinc-700 text-white">
                          <SelectValue placeholder="Cambiar" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                          {Object.entries(statusConfig).map(([k, v]) => (
                            <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
          <DialogHeader><DialogTitle>Nuevo lote de importación</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Distribuidor</Label>
              <Select value={form.distributorId} onValueChange={(v) => setForm({ ...form, distributorId: v || "" })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectItem value="none">Sin distribuidor</SelectItem>
                  {distributors.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Productos</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input value={searchProd} onChange={(e) => setSearchProd(e.target.value)} placeholder="Buscar..." className="pl-9 bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {filteredProducts.slice(0, 8).map((p) => (
                  <button key={p.id} type="button" onClick={() => addProduct(p)} className="w-full text-left px-3 py-1.5 rounded text-sm text-zinc-300 hover:bg-white/5">{p.name}</button>
                ))}
              </div>
            </div>
            {cart.length > 0 && (
              <div className="bg-zinc-800/50 rounded-lg p-3 space-y-1">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-300">{item.name} × {item.quantity}</span>
                    <button type="button" onClick={() => setCart(cart.filter(c => c.productId !== item.productId))} className="text-red-400 text-xs">Quitar</button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Label>Costo total USD</Label>
              <Input type="number" step="0.01" value={form.totalCostUSD} onChange={(e) => setForm({ ...form, totalCostUSD: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-zinc-400">Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-[#22C55E] hover:bg-[#16A34A] text-white">{saving ? "Guardando..." : "Crear lote"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
