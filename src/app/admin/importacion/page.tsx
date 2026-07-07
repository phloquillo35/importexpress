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
  store: { id: string; name: string } | null
  products: { productId: string; name?: string; quantity: number }[]
  totalCostUSD: number
  status: string
  notes: string | null
}

interface Product {
  id: string
  name: string
}

interface StoreType {
  id: string
  name: string
}

export default function ImportacionPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [searchProd, setSearchProd] = useState("")
  const [cart, setCart] = useState<{ productId: string; name: string; quantity: number }[]>([])
  const [form, setForm] = useState({ storeId: "", totalCostUSD: "", notes: "" })
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
    fetch("/api/tiendas").then(r => r.json()).then(d => setStores(Array.isArray(d) ? d : [])).catch(() => toast.error("Error al cargar tiendas"))
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
          storeId: form.storeId || null,
          totalCostUSD: totalCost || 0,
          notes: form.notes || null,
          products: cart.map(c => ({ productId: c.productId, quantity: c.quantity })),
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Lote creado")
      setDialogOpen(false)
      setCart([])
      setForm({ storeId: "", totalCostUSD: "", notes: "" })
      fetchBatches()
    } catch { toast.error("Error al guardar") }
    finally { setSaving(false) }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/importacion/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
      if (!res.ok) throw new Error()
      toast.success("Estado actualizado")
      fetchBatches()
    } catch { toast.error("Error al actualizar") }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Importación</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestioná los lotes de importación</p>
        </div>
        <Button onClick={() => { setCart([]); setForm({ storeId: "", totalCostUSD: "", notes: "" }); setDialogOpen(true) }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Nuevo lote
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant={statusFilter === "" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("")} className="text-xs">Todos</Button>
        {Object.entries(statusConfig).map(([k, v]) => (
          <Button key={k} variant={statusFilter === k ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(k)} className="text-xs">{v.label}</Button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Fecha</TableHead>
              <TableHead className="text-muted-foreground">Tienda</TableHead>
              <TableHead className="text-muted-foreground text-right">Productos</TableHead>
              <TableHead className="text-muted-foreground text-right">Costo total</TableHead>
              <TableHead className="text-muted-foreground text-center">Estado</TableHead>
              <TableHead className="text-muted-foreground text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">Cargando...</TableCell></TableRow>
            ) : batches.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12"><Ship className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>Sin lotes</p></TableCell></TableRow>
            ) : (
              batches.map((b) => {
                const cfg = statusConfig[b.status] || statusConfig.pending
                return (
                  <TableRow key={b.id} className="border-border hover:bg-muted">
                    <TableCell className="text-muted-foreground">{formatDate(b.date)}</TableCell>
                    <TableCell className="text-muted-foreground">{b.store?.name || "—"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{Array.isArray(b.products) ? b.products.length : 0}</TableCell>
                    <TableCell className="text-right text-foreground">{formatUSD(b.totalCostUSD)}</TableCell>
                    <TableCell className="text-center"><Badge className={`${cfg.className} border-0`}>{cfg.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Select onValueChange={(v: any) => updateStatus(b.id, v || "pending")}>
                        <SelectTrigger className="w-28 h-7 text-xs bg-muted border-border text-foreground">
                          <SelectValue placeholder="Cambiar">{(value) => !value ? "Cambiar" : statusConfig[value]?.label || value}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className=" bg-popover text-popover-foreground">
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
        <DialogContent className=" bg-popover text-popover-foreground max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo lote de importación</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tienda</Label>
              <Select value={form.storeId} onValueChange={(v) => setForm({ ...form, storeId: v || "" })}>
                <SelectTrigger className="bg-muted border-border text-foreground">
                  <SelectValue placeholder="Seleccionar">{(value) => !value ? "Seleccionar" : value === "none" ? "Sin tienda" : stores.find(s => s.id === value)?.name || value}</SelectValue>
                </SelectTrigger>
                <SelectContent className=" bg-popover text-popover-foreground">
                  <SelectItem value="none">Sin tienda</SelectItem>
                  {stores.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Productos</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={searchProd} onChange={(e) => setSearchProd(e.target.value)} className="bg-muted border-border text-foreground pl-9" placeholder="Buscar productos..." />
              </div>
              <div className="max-h-40 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {filteredProducts.slice(0, 30).map((p) => (
                  <button key={p.id} type="button" onClick={() => addProduct(p)} className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">{p.name}</button>
                ))}
                {filteredProducts.length === 0 && <p className="text-xs text-muted-foreground px-3 py-2">Sin resultados</p>}
              </div>
            </div>
            {cart.length > 0 && (
              <div className="space-y-2 border border-border rounded-lg p-3">
                <Label className="text-sm font-medium">Productos seleccionados</Label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {cart.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-foreground truncate flex-1">{c.name}</span>
                      <div className="flex items-center gap-2 ml-2">
                        <button type="button" onClick={() => {
                          if (c.quantity <= 1) setCart(cart.filter((_, i) => i !== idx))
                          else setCart(cart.map((item, i) => i === idx ? { ...item, quantity: item.quantity - 1 } : item))
                        }} className="w-6 h-6 rounded-full bg-muted text-muted-foreground hover:text-foreground text-xs flex items-center justify-center">−</button>
                        <span className="text-foreground font-medium w-6 text-center">{c.quantity}</span>
                        <button type="button" onClick={() => setCart(cart.map((item, i) => i === idx ? { ...item, quantity: item.quantity + 1 } : item))} className="w-6 h-6 rounded-full bg-muted text-muted-foreground hover:text-foreground text-xs flex items-center justify-center">+</button>
                        <button type="button" onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 text-xs ml-1">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Costo total (USD)</Label>
              <Input type="number" step="0.01" value={form.totalCostUSD} onChange={(e) => setForm({ ...form, totalCostUSD: e.target.value })} className="bg-muted border-border text-foreground" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-muted border-border text-foreground" placeholder="Opcional" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">Cancelar</Button>
              <Button type="submit" disabled={saving || cart.length === 0} className="bg-primary hover:bg-primary/90 text-primary-foreground">{saving ? "Guardando..." : "Crear lote"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
