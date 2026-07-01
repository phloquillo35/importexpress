"use client"

import { useEffect, useState, useCallback } from "react"
import { Package, Plus, Search } from "lucide-react"
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
  entregado: { label: "Entregado", className: "bg-zinc-500/10 text-[#6e6e73]" },
  cancelado: { label: "Cancelado", className: "bg-red-500/10 text-red-400" },
}

interface OrderItem {
  id: string
  quantity: number
  priceUSD: number
  trackingCode: string | null
  shippingStatus: string
  bulkType: string | null
  product: { name: string; slug: string }
  bulk: { courier: string; trackingCode: string | null; type: string } | null
}

interface Distributor {
  id: string
  name: string
}

interface Order {
  id: string
  clientName: string
  clientSurname: string
  clientPhone: string
  clientEmail: string
  distributor: Distributor | null
  clientContact: string
  totalUSD: number
  totalARS: number | null
  status: string
  notes: string | null
  createdAt: string
  items: OrderItem[]
}

interface Product {
  id: string
  name: string
  priceUSD: number
  stock: number
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [searchProd, setSearchProd] = useState("")
  const [cart, setCart] = useState<{ productId: string; name: string; quantity: number; priceUSD: number }[]>([])
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [form, setForm] = useState({ clientName: "", clientSurname: "", clientPhone: "", clientEmail: "", distributorId: "", clientContact: "" })
  const [saving, setSaving] = useState(false)

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)
      const res = await fetch(`/api/pedidos?${params}`)
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Error al cargar pedidos")
    } finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  useEffect(() => {
    fetch("/api/productos?limit=100").then(r => r.json()).then(d => setProducts(d.products || [])).catch(() => toast.error("Error al cargar productos"))
    fetch("/api/distribuidores").then(r => r.json()).then(d => setDistributors(Array.isArray(d) ? d : [])).catch(() => toast.error("Error al cargar distribuidores"))
  }, [])

  async function updateStatus(orderId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/pedidos/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al actualizar estado")
      }
      toast.success("Estado actualizado")
      fetchOrders()
      if (detailOrder?.id === orderId) setDetailOrder({ ...detailOrder, status: newStatus })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar estado")
    }
  }

  function addToCart(product: Product) {
    const existing = cart.find(c => c.productId === product.id)
    if (existing) {
      setCart(cart.map(c => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c))
    } else {
      setCart([...cart, { productId: product.id, name: product.name, quantity: 1, priceUSD: product.priceUSD }])
    }
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter(c => c.productId !== productId))
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchProd.toLowerCase())
  )

  const totalUSD = cart.reduce((sum, item) => sum + item.priceUSD * item.quantity, 0)

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clientName || cart.length === 0) {
      toast.error("Completá nombre del cliente y agregá productos")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: form.clientName,
          clientSurname: form.clientSurname,
          clientPhone: form.clientPhone,
          clientEmail: form.clientEmail,
          distributorId: form.distributorId || null,
          clientContact: form.clientContact,
          items: cart.map(c => ({ productId: c.productId, quantity: c.quantity, priceUSD: c.priceUSD })),
          totalUSD,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al crear pedido")
      }
      toast.success("Pedido creado")
      setDialogOpen(false)
      setCart([])
      setForm({ clientName: "", clientSurname: "", clientPhone: "", clientEmail: "", distributorId: "", clientContact: "" })
      fetchOrders()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear pedido")
    } finally { setSaving(false) }
  }

  function getItemStatusBadge(status: string) {
    const cfg = statusConfig[status] || statusConfig.pending
    return <Badge className={`${cfg.className} border-0 text-[10px]`}>{cfg.label}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1d1d1f] font-heading">Pedidos</h1>
          <p className="text-[#6e6e73] text-sm mt-1">{orders.length} pedidos</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-[#0071e3] hover:bg-[#0077ed] text-white">
          <Plus className="w-4 h-4 mr-2" /> Nuevo pedido
        </Button>
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "")}>
          <SelectTrigger className="w-40 bg-[#f5f5f7] border-[#d2d2d7]/60 text-[#1d1d1f]">
            <SelectValue placeholder="Filtrar estado" />
          </SelectTrigger>
          <SelectContent className=" bg-white text-[#1d1d1f]">
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white border border-[#d2d2d7]/60 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-[#d2d2d7]/60 hover:bg-transparent">
              <TableHead className="text-[#6e6e73]">Cliente</TableHead>
              <TableHead className="text-[#6e6e73] hidden sm:table-cell">Contacto</TableHead>
              <TableHead className="text-[#6e6e73] hidden md:table-cell">Distribuidor</TableHead>
              <TableHead className="text-[#6e6e73] text-right">Total</TableHead>
              <TableHead className="text-[#6e6e73] text-center">Estado</TableHead>
              <TableHead className="text-[#6e6e73] text-right hidden md:table-cell">Fecha</TableHead>
              <TableHead className="text-[#6e6e73] text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-[#6e6e73] py-12">Cargando...</TableCell></TableRow>
            ) : orders.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-[#6e6e73] py-12"><Package className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>Sin pedidos</p></TableCell></TableRow>
            ) : (
              orders.map((o) => {
                const cfg = statusConfig[o.status] || statusConfig.pending
                return (
                  <TableRow key={o.id} className="border-[#d2d2d7]/60 hover:bg-[#f5f5f7] cursor-pointer" onClick={() => setDetailOrder(o)}>
                    <TableCell className="font-medium text-[#1d1d1f]">{o.clientName} {o.clientSurname}</TableCell>
                    <TableCell className="text-[#6e6e73] text-sm hidden sm:table-cell">{o.clientPhone || o.clientContact}</TableCell>
                    <TableCell className="text-[#6e6e73] text-sm hidden md:table-cell">{o.distributor?.name || "—"}</TableCell>
                    <TableCell className="text-right text-[#1d1d1f]">{formatUSD(o.totalUSD)}</TableCell>
                    <TableCell className="text-center"><Badge className={`${cfg.className} border-0`}>{cfg.label}</Badge></TableCell>
                    <TableCell className="text-right text-[#6e6e73] text-sm hidden md:table-cell">{formatDate(o.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Select onValueChange={(v: any) => { updateStatus(o.id, v) }}>
                        <SelectTrigger className="w-28 h-7 text-xs bg-[#f5f5f7] border-[#d2d2d7]/60 text-[#1d1d1f]">
                          <SelectValue placeholder="Cambiar" />
                        </SelectTrigger>
                        <SelectContent className=" bg-white text-[#1d1d1f]">
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

      <Dialog open={!!detailOrder} onOpenChange={(o) => { if (!o) setDetailOrder(null) }}>
        <DialogContent className=" bg-white text-[#1d1d1f] max-w-lg">
          <DialogHeader><DialogTitle>Detalle del pedido</DialogTitle></DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-[#6e6e73]">Nombre</p><p className="text-[#1d1d1f]">{detailOrder.clientName} {detailOrder.clientSurname}</p></div>
                <div><p className="text-[#6e6e73]">Teléfono</p><p className="text-[#1d1d1f]">{detailOrder.clientPhone || "—"}</p></div>
                <div><p className="text-[#6e6e73]">Email</p><p className="text-[#1d1d1f]">{detailOrder.clientEmail || "—"}</p></div>
                <div><p className="text-[#6e6e73]">Distribuidor</p><p className="text-[#1d1d1f]">{detailOrder.distributor?.name || "—"}</p></div>
              </div>
              <div>
                <p className="text-sm text-[#6e6e73] mb-2">Productos</p>
                {detailOrder.items.map((item) => (
                  <div key={item.id} className="border border-[#d2d2d7]/60 rounded-lg p-3 mb-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6e6e73]">{item.product.name} × {item.quantity}</span>
                      <span className="text-[#1d1d1f]">{formatUSD(item.priceUSD * item.quantity)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs">
                      <span className="text-zinc-600">
                        {item.bulkType === "grande" ? "📦 Buspack" : item.bulkType === "chico" ? "📬 Correo Arg." : "—"}
                      </span>
                      {item.trackingCode && (
                        <span className="text-blue-400">📍 {item.trackingCode}</span>
                      )}
                      {getItemStatusBadge(item.shippingStatus)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-[#d2d2d7]/60 pt-2">
                <span className="font-medium text-[#1d1d1f]">Total</span>
                <span className="font-bold text-[#F59E0B]">{formatUSD(detailOrder.totalUSD)}</span>
              </div>
              <div>
                <p className="text-sm text-[#6e6e73] mb-1">Estado del pedido</p>
                <Select value={detailOrder.status} onValueChange={(v: any) => updateStatus(detailOrder.id, v)}>
                  <SelectTrigger className="bg-[#f5f5f7] border-[#d2d2d7]/60 text-[#1d1d1f]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className=" bg-white text-[#1d1d1f]">
                    {Object.entries(statusConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {detailOrder.notes && (
                <div><p className="text-sm text-[#6e6e73]">Notas</p><p className="text-[#6e6e73]">{detailOrder.notes}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className=" bg-white text-[#1d1d1f] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo pedido</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateOrder} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className="bg-[#f5f5f7] border-[#d2d2d7]/60 text-[#1d1d1f]" />
              </div>
              <div className="space-y-2">
                <Label>Apellido</Label>
                <Input value={form.clientSurname} onChange={(e) => setForm({ ...form, clientSurname: e.target.value })} className="bg-[#f5f5f7] border-[#d2d2d7]/60 text-[#1d1d1f]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} className="bg-[#f5f5f7] border-[#d2d2d7]/60 text-[#1d1d1f]" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} className="bg-[#f5f5f7] border-[#d2d2d7]/60 text-[#1d1d1f]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Distribuidor</Label>
              <Select value={form.distributorId} onValueChange={(v) => setForm({ ...form, distributorId: v === "__none" ? "" : v || "" })}>
                <SelectTrigger className="bg-[#f5f5f7] border-[#d2d2d7]/60 text-[#1d1d1f]">
                  <SelectValue placeholder="Seleccionar distribuidor" />
                </SelectTrigger>
                <SelectContent className=" bg-white text-[#1d1d1f]">
                  <SelectItem value="__none">Sin distribuidor</SelectItem>
                  {distributors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Productos</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6e73]" />
                <Input value={searchProd} onChange={(e) => setSearchProd(e.target.value)} placeholder="Buscar producto..." className="pl-9 bg-[#f5f5f7] border-[#d2d2d7]/60 text-[#1d1d1f]" />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filteredProducts.slice(0, 10).map((p) => (
                  <button key={p.id} type="button" onClick={() => addToCart(p)} className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#6e6e73] hover:bg-[#f5f5f7] transition-colors">
                    {p.name} <span className="text-[#6e6e73]">({formatUSD(p.priceUSD)})</span>
                  </button>
                ))}
              </div>
            </div>
            {cart.length > 0 && (
              <div className="bg-[#f5f5f7]/50 rounded-lg p-3 space-y-2">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between text-sm">
                    <span className="text-[#6e6e73]">{item.name} × {item.quantity}</span>
                    <button type="button" onClick={() => removeFromCart(item.productId)} className="text-red-400 text-xs hover:text-red-300">Quitar</button>
                  </div>
                ))}
                <div className="border-t border-[#d2d2d7]/60 pt-2 flex justify-between font-medium">
                  <span className="text-[#1d1d1f]">Total</span>
                  <span className="text-[#F59E0B]">{formatUSD(totalUSD)}</span>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-[#6e6e73]">Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-[#0071e3] hover:bg-[#0077ed] text-white">{saving ? "Guardando..." : "Crear pedido"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
