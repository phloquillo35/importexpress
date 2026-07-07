"use client"

import { useEffect, useState, useCallback, Fragment } from "react"
import { Package, Plus, Search, ChevronDown, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { formatUSD } from "@/lib/utils"
import { calculateFinalPrice } from "@/lib/pricing"
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
  entregado: { label: "Entregado", className: "bg-zinc-500/10 text-muted-foreground" },
  cancelado: { label: "Cancelado", className: "bg-red-500/10 text-red-400" },
}

interface OrderItem {
  id: string
  quantity: number
  priceUSD: number
  trackingCode: string | null
  shippingStatus: string
  bulkType: string | null
  costUSDT: number | null
  yoniEnabled: boolean
  yoniType: string
  yoniValue: number
  shippingCost: number
  profitType: string
  profitValue: number
  product: {
    name: string
    slug: string
    images: string[]
    categoryId: string | null
    stock: number
    costUSDT: number | null
    priceUSD: number
    finalPriceUSD: number
    finalPriceARS: number
    yoniEnabled: boolean
    yoniType: string
    yoniValue: number
    shippingCost: number
    profitType: string
    profitValue: number
  }
  bulk: { courier: string; trackingCode: string | null; type: string } | null
}

interface StoreType {
  id: string
  name: string
}

interface Order {
  id: string
  clientName: string
  clientSurname: string
  clientPhone: string
  clientEmail: string
  store: StoreType | null
  clientContact: string
  totalUSD: number
  totalARS: number | null
  status: string
  notes: string | null
  createdAt: string
  exchangeRate: number
  usdtRate: number
  items: OrderItem[]
}

interface Product {
  id: string
  name: string
  priceUSD: number
  stock: number
}

function computeItemPricing(item: OrderItem, exchangeRate: number, usdtRate: number) {
  const perUnit = calculateFinalPrice({
    costUSDT: item.costUSDT ?? item.product.costUSDT ?? 0,
    yoniEnabled: item.yoniEnabled ?? item.product.yoniEnabled,
    yoniType: (item.yoniType ?? item.product.yoniType ?? "percentage") as "percentage" | "fixed_usdt" | "fixed_ars",
    yoniValue: item.yoniValue ?? item.product.yoniValue ?? 0,
    shippingCost: item.shippingCost ?? item.product.shippingCost ?? 0,
    profitType: (item.profitType ?? item.product.profitType ?? "percentage") as "percentage" | "fixed_usdt" | "fixed_ars",
    profitValue: item.profitValue ?? item.product.profitValue ?? 0,
    exchangeRate,
    usdtRate,
  })
  return {
    costUSDT: (item.costUSDT ?? item.product.costUSDT ?? 0) * item.quantity,
    yoniUSDT: Math.round(perUnit.yoniUSDT * item.quantity * 100) / 100,
    shippingCost: (item.shippingCost ?? item.product.shippingCost ?? 0) * item.quantity,
    subtotalARS: Math.round(perUnit.subtotalARS * item.quantity),
    profitARS: Math.round(perUnit.profitARS * item.quantity),
    finalPriceARS: Math.round(perUnit.finalPriceARS * item.quantity),
    finalPriceUSD: Math.round(perUnit.finalPriceUSD * item.quantity * 100) / 100,
  }
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
  const [stores, setStores] = useState<StoreType[]>([])
  const [form, setForm] = useState({ clientName: "", clientSurname: "", clientPhone: "", clientEmail: "", storeId: "", clientContact: "" })
  const [saving, setSaving] = useState(false)
  const [exchangeRate, setExchangeRate] = useState(1)
  const [usdtRate, setUsdtRate] = useState(1)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

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
    fetch("/api/tiendas").then(r => r.json()).then(d => setStores(Array.isArray(d) ? d : [])).catch(() => toast.error("Error al cargar tiendas"))
    fetch("/api/configuracion").then(r => r.json()).then(data => {
      setExchangeRate(Number(data.exchange_rate) || 1)
      setUsdtRate(Number(data.usdt_rate) || 1)
    }).catch(() => {})
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
          storeId: form.storeId || null,
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
      setForm({ clientName: "", clientSurname: "", clientPhone: "", clientEmail: "", storeId: "", clientContact: "" })
      fetchOrders()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear pedido")
    } finally { setSaving(false) }
  }

  function getItemStatusBadge(status: string) {
    const cfg = statusConfig[status] || statusConfig.pending
    return <Badge className={`${cfg.className} border-0 text-[10px]`}>{cfg.label}</Badge>
  }

  function toggleOrderExpand(orderId: string) {
    setExpandedOrders(prev => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Pedidos</h1>
          <p className="text-muted-foreground text-sm mt-1">{orders.length} pedidos</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Nuevo pedido
        </Button>
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "")}>
          <SelectTrigger className="w-40 bg-muted border-border text-foreground">
            <SelectValue placeholder="Filtrar estado" />
          </SelectTrigger>
          <SelectContent className=" bg-card text-foreground">
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground w-8"></TableHead>
              <TableHead className="text-muted-foreground">Cliente</TableHead>
              <TableHead className="text-muted-foreground hidden sm:table-cell">Contacto</TableHead>
              <TableHead className="text-muted-foreground">Producto</TableHead>
              <TableHead className="text-muted-foreground text-right">Costo USDT</TableHead>
              <TableHead className="text-muted-foreground text-right">Logística</TableHead>
              <TableHead className="text-muted-foreground text-right hidden md:table-cell">Envío ARS</TableHead>
              <TableHead className="text-muted-foreground text-right hidden md:table-cell">Subtotal ARS</TableHead>
              <TableHead className="text-muted-foreground text-right hidden lg:table-cell">Ganancia ARS</TableHead>
              <TableHead className="text-muted-foreground text-right">Final ARS</TableHead>
              <TableHead className="text-muted-foreground text-right hidden lg:table-cell">Final USD</TableHead>
              <TableHead className="text-muted-foreground text-center">Tracking</TableHead>
              <TableHead className="text-muted-foreground text-center">Estado</TableHead>
              <TableHead className="text-muted-foreground text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground py-12">Cargando...</TableCell></TableRow>
            ) : orders.length === 0 ? (
              <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground py-12"><Package className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>Sin pedidos</p></TableCell></TableRow>
            ) : (
              orders.map((o) => {
                const cfg = statusConfig[o.status] || statusConfig.pending
                const isExpanded = expandedOrders.has(o.id)
                const hasMultipleItems = o.items.length > 1

                return (
                  <Fragment key={o.id}>
                    {o.items.map((item, itemIdx) => {
                      const isFirst = itemIdx === 0
                      const pricing = computeItemPricing(item, o.exchangeRate || exchangeRate, o.usdtRate || usdtRate)
                      return (
                        <TableRow
                          key={item.id}
                          className={`border-border hover:bg-muted ${isFirst ? "" : "border-t-0"}`}
                        >
                          {isFirst ? (
                            <>
                              <TableCell
                                className="text-muted-foreground cursor-pointer"
                                onClick={() => hasMultipleItems && toggleOrderExpand(o.id)}
                              >
                                {hasMultipleItems ? (
                                  isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                                ) : null}
                              </TableCell>
                              <TableCell
                                className="font-medium text-foreground cursor-pointer"
                                onClick={() => setDetailOrder(o)}
                              >
                                {o.clientName} {o.clientSurname}
                              </TableCell>
                              <TableCell
                                className="text-muted-foreground text-sm hidden sm:table-cell cursor-pointer"
                                onClick={() => setDetailOrder(o)}
                              >
                                {o.clientPhone || o.clientContact}
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="text-muted-foreground" />
                              <TableCell />
                              <TableCell className="hidden sm:table-cell" />
                            </>
                          )}

                          <TableCell className="text-foreground text-sm">
                            {item.product.name}
                            <span className="text-muted-foreground ml-1">×{item.quantity}</span>
                          </TableCell>
                          <TableCell className="text-right text-foreground text-sm">
                            ${pricing.costUSDT.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm">
                            {item.product.yoniEnabled ? `$${pricing.yoniUSDT.toFixed(2)}` : "—"}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm hidden md:table-cell">
                            ${pricing.shippingCost.toLocaleString("es-AR")}
                          </TableCell>
                          <TableCell className="text-right text-foreground text-sm hidden md:table-cell">
                            ${pricing.subtotalARS.toLocaleString("es-AR")}
                          </TableCell>
                          <TableCell className="text-right text-[#0071e3] text-sm hidden lg:table-cell">
                            ${pricing.profitARS.toLocaleString("es-AR")}
                          </TableCell>
                          <TableCell className="text-right text-[#22C55E] font-medium text-sm">
                            ${pricing.finalPriceARS.toLocaleString("es-AR")}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm hidden lg:table-cell">
                            ${pricing.finalPriceUSD.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {item.trackingCode ? (
                              <span className="text-blue-400">{item.trackingCode}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {getItemStatusBadge(item.shippingStatus)}
                          </TableCell>

                          {isFirst ? (
                            <TableCell className="text-right">
                              <div className="flex items-center gap-1">
                                <Badge className={`${cfg.className} border-0 text-[10px] mr-1 hidden lg:inline-flex`}>
                                  {cfg.label}
                                </Badge>
                                <Select onValueChange={(v: any) => { updateStatus(o.id, v) }}>
                                  <SelectTrigger className="w-24 h-7 text-xs bg-muted border-border text-foreground">
                                    <SelectValue placeholder="Cambiar" />
                                  </SelectTrigger>
                                  <SelectContent className=" bg-card text-foreground">
                                    {Object.entries(statusConfig).map(([k, v]) => (
                                      <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                          ) : (
                            <TableCell className="text-right" />
                          )}
                        </TableRow>
                      )
                    })}
                    <TableRow className="border-border hover:bg-transparent">
                      <TableCell colSpan={14} className="py-1 px-0">
                        <div className="h-px bg-border/50" />
                      </TableCell>
                    </TableRow>
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!detailOrder} onOpenChange={(o) => { if (!o) setDetailOrder(null) }}>
        <DialogContent className=" bg-card text-foreground max-w-lg">
          <DialogHeader><DialogTitle>Detalle del pedido</DialogTitle></DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Nombre</p><p className="text-foreground">{detailOrder.clientName} {detailOrder.clientSurname}</p></div>
                <div><p className="text-muted-foreground">Teléfono</p><p className="text-foreground">{detailOrder.clientPhone || "—"}</p></div>
                <div><p className="text-muted-foreground">Email</p><p className="text-foreground">{detailOrder.clientEmail || "—"}</p></div>
                <div><p className="text-muted-foreground">Tienda</p><p className="text-foreground">{detailOrder.store?.name || "—"}</p></div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Productos</p>
                {detailOrder.items.map((item) => (
                  <div key={item.id} className="border border-border rounded-lg p-3 mb-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.product.name} × {item.quantity}</span>
                      <span className="text-foreground">{formatUSD(item.priceUSD * item.quantity)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs">
                      <span className="text-muted-foreground">
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
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-medium text-foreground">Total</span>
                <span className="font-bold text-[#F59E0B]">{formatUSD(detailOrder.totalUSD)}</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Estado del pedido</p>
                <Select value={detailOrder.status} onValueChange={(v: any) => updateStatus(detailOrder.id, v)}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className=" bg-card text-foreground">
                    {Object.entries(statusConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {detailOrder.notes && (
                <div><p className="text-sm text-muted-foreground">Notas</p><p className="text-muted-foreground">{detailOrder.notes}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className=" bg-card text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo pedido</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateOrder} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className="bg-muted border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <Label>Apellido</Label>
                <Input value={form.clientSurname} onChange={(e) => setForm({ ...form, clientSurname: e.target.value })} className="bg-muted border-border text-foreground" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} className="bg-muted border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} className="bg-muted border-border text-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tienda</Label>
              <Select value={form.storeId} onValueChange={(v) => setForm({ ...form, storeId: v === "__none" ? "" : v || "" })}>
                <SelectTrigger className="bg-muted border-border text-foreground">
                  <SelectValue placeholder="Seleccionar tienda" />
                </SelectTrigger>
                <SelectContent className=" bg-card text-foreground">
                  <SelectItem value="__none">Sin tienda</SelectItem>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Productos</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={searchProd} onChange={(e) => setSearchProd(e.target.value)} placeholder="Buscar producto..." className="pl-9 bg-muted border-border text-foreground" />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filteredProducts.slice(0, 10).map((p) => (
                  <button key={p.id} type="button" onClick={() => addToCart(p)} className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
                    {p.name} <span className="text-muted-foreground">({formatUSD(p.priceUSD)})</span>
                  </button>
                ))}
              </div>
            </div>
            {cart.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.name} × {item.quantity}</span>
                    <button type="button" onClick={() => removeFromCart(item.productId)} className="text-red-400 text-xs hover:text-red-300">Quitar</button>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between font-medium">
                  <span className="text-foreground">Total</span>
                  <span className="text-[#F59E0B]">{formatUSD(totalUSD)}</span>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">{saving ? "Guardando..." : "Crear pedido"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
