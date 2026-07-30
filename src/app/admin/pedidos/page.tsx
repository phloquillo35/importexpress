"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Package, Plus, Search, Trash2, Pencil, ChevronLeft, ChevronRight } from "lucide-react"
import { PapeleraModal } from "@/components/papelera-modal"
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

const courierLabel: Record<string, string> = {
  buspack: "📦 Buspack",
  correo_argentino: "📬 Correo Arg.",
  andreani: "📭 Andreani",
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-yellow-500/10 text-yellow-400" },
  en_camino: { label: "En camino", className: "bg-blue-500/10 text-blue-400" },
  demorado: { label: "Demorado", className: "bg-orange-500/10 text-orange-400" },
  llego: { label: "Llegó", className: "bg-[#22C55E]/10 text-[#22C55E]" },
  entregado: { label: "Entregado", className: "bg-zinc-500/10 text-muted-foreground" },
  cancelado: { label: "Cancelado", className: "bg-red-500/10 text-red-400" },
}

const paymentConfig: Record<string, { label: string; className: string }> = {
  debe: { label: "Debe", className: "text-orange-400" },
  seña: { label: "Seña", className: "text-yellow-400" },
  pagado: { label: "Pagado", className: "text-[#22C55E]" },
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
  productName: string | null
  productSlug: string | null
  product?: {
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

interface Payment {
  id: string
  amountUSD: number
  amountARS: number | null
  concept: string | null
  date: string
}

interface Order {
  id: string
  internalNumber: number
  clientName: string
  clientSurname: string
  clientPhone: string
  clientEmail: string
  store: StoreType | null
  clientContact: string
  paymentStatus: string
  amountPaidUSD: number
  amountPaidARS: number | null
  totalUSD: number
  totalARS: number | null
  status: string
  notes: string | null
  createdAt: string
  exchangeRate: number
  usdtRate: number
  items: OrderItem[]
  payments: Payment[]
}

interface Product {
  id: string
  name: string
  priceUSD: number
  stock: number
  category?: { name: string } | null
  costUSDT?: number
  shippingCost?: number
  finalPriceUSD?: number
  finalPriceARS?: number
  isAvailable?: boolean
}

function computeItemPricing(item: OrderItem, exchangeRate: number, usdtRate: number) {
  const perUnit = calculateFinalPrice({
    costUSDT: item.costUSDT ?? 0,
    yoniEnabled: item.yoniEnabled ?? false,
    yoniType: (item.yoniType ?? "percentage") as "percentage" | "fixed_usdt" | "fixed_ars",
    yoniValue: item.yoniValue ?? 0,
    shippingCost: item.shippingCost ?? 0,
    profitType: (item.profitType ?? "percentage") as "percentage" | "fixed_usdt" | "fixed_ars",
    profitValue: item.profitValue ?? 0,
    exchangeRate,
    usdtRate,
  })
  return {
    costUSDT: (item.costUSDT ?? 0) * item.quantity,
    yoniUSDT: Math.round(perUnit.yoniUSDT * item.quantity * 100) / 100,
    shippingCost: (item.shippingCost ?? 0) * item.quantity,
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
  const [products, setProducts] = useState<Product[]>([])
  const [searchProd, setSearchProd] = useState("")
  const [cart, setCart] = useState<{ productId: string; name: string; quantity: number; priceUSD: number }[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [form, setForm] = useState({ clientName: "", clientSurname: "", clientPhone: "", clientEmail: "", storeId: "", clientContact: "" })
  const [saving, setSaving] = useState(false)
  const [exchangeRate, setExchangeRate] = useState(1)
  const [usdtRate, setUsdtRate] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null)
  const [productDetail, setProductDetail] = useState<{ item: OrderItem; order: Order } | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentCurrency, setPaymentCurrency] = useState("USD")
  const [savingPay, setSavingPay] = useState(false)
  const [editingOrder, setEditingOrder] = useState(false)
  const [editForm, setEditForm] = useState({ clientName: "", clientSurname: "", clientPhone: "", clientEmail: "", clientContact: "", storeId: "", status: "", notes: "" })
  const [savingEdit, setSavingEdit] = useState(false)
  const searchParams = useSearchParams()
  const highlightId = searchParams.get("highlight")
  const tableRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 50

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", String(limit))
      const res = await fetch(`/api/pedidos?${params}`)
      const data = await res.json()
      if (data.orders) {
        setOrders(data.orders)
        setTotal(data.total)
      } else {
        setOrders(Array.isArray(data) ? data : [])
        setTotal(0)
      }
    } catch {
      toast.error("Error al cargar pedidos")
    } finally { setLoading(false) }
  }, [page])

  useEffect(() => {
    let cancelled = false
    async function fetchOrdersEffect() {
      try {
        const params = new URLSearchParams()
        params.set("page", String(page))
        params.set("limit", String(limit))
        const res = await fetch(`/api/pedidos?${params}`)
        const data = await res.json()
        if (!cancelled) {
          if (data.orders) {
            setOrders(data.orders)
            setTotal(data.total)
          } else {
            setOrders(Array.isArray(data) ? data : [])
            setTotal(0)
          }
        }
      } catch {
        if (!cancelled) toast.error("Error al cargar pedidos")
      } finally { if (!cancelled) setLoading(false) }
    }
    fetchOrdersEffect()
    return () => { cancelled = true }
  }, [page])

  function handleProductDetail(item: OrderItem, order: Order) {
    setPaymentAmount("")
    setPaymentCurrency("USD")
    setEditingOrder(false)
    setProductDetail({ item, order })
  }

  async function handleSavePayment() {
    if (!productDetail) return
    setSavingPay(true)
    try {
      const res = await fetch(`/api/pedidos/${productDetail.order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment: { amount: Number(paymentAmount) || 0, currency: paymentCurrency },
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al guardar pago")
      }
      const updated = await res.json()
      toast.success("Pago registrado")
      setProductDetail({ item: productDetail.item, order: updated })
      fetchOrders()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar pago")
    } finally { setSavingPay(false) }
  }

  async function handleSaveEdit() {
    if (!productDetail) return
    setSavingEdit(true)
    try {
      const body: Record<string, unknown> = {}
      if (editForm.clientName !== undefined) body.clientName = editForm.clientName
      if (editForm.clientSurname !== undefined) body.clientSurname = editForm.clientSurname
      if (editForm.clientPhone !== undefined) body.clientPhone = editForm.clientPhone
      if (editForm.clientEmail !== undefined) body.clientEmail = editForm.clientEmail
      if (editForm.clientContact !== undefined) body.clientContact = editForm.clientContact
      if (editForm.storeId) body.storeId = editForm.storeId
      else body.storeId = null
      if (editForm.status) body.status = editForm.status
      if (editForm.notes !== undefined) body.notes = editForm.notes

      const res = await fetch(`/api/pedidos/${productDetail.order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al actualizar pedido")
      }
      const updated = await res.json()
      toast.success("Pedido actualizado")
      setEditingOrder(false)
      setProductDetail({ item: productDetail.item, order: updated })
      fetchOrders()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar pedido")
    } finally { setSavingEdit(false) }
  }

  function startEditing(order: Order) {
    setEditForm({
      clientName: order.clientName,
      clientSurname: order.clientSurname,
      clientPhone: order.clientPhone,
      clientEmail: order.clientEmail,
      clientContact: order.clientContact,
      storeId: order.store?.id || "",
      status: order.status,
      notes: order.notes || "",
    })
    setEditingOrder(true)
  }

  useEffect(() => {
    fetch("/api/productos?limit=100").then(r => r.json()).then(d => setProducts(d.products || [])).catch(() => toast.error("Error al cargar productos"))
    fetch("/api/tiendas").then(r => r.json()).then(d => setStores(Array.isArray(d) ? d : [])).catch(() => toast.error("Error al cargar tiendas"))
    fetch("/api/configuracion").then(r => r.json()).then(data => {
      setExchangeRate(Number(data.exchange_rate) || 1)
      setUsdtRate(Number(data.usdt_rate) || 1)
    }).catch(() => {})
  }, [])

  const statusPriority: Record<string, number> = {
    pending: 0,
    en_camino: 1,
    demorado: 2,
    llego: 3,
    entregado: 4,
    cancelado: 5,
  }

  const flatItems = useMemo(() => {
    const items: { item: OrderItem; order: Order }[] = []
    for (const order of orders) {
      for (const item of order.items) {
        items.push({ item, order })
      }
    }
    const filtered = statusFilter
      ? items.filter(({ item }) => item.shippingStatus === statusFilter)
      : items
    filtered.sort((a, b) => {
      const s = (statusPriority[a.item.shippingStatus] ?? 99) - (statusPriority[b.item.shippingStatus] ?? 99)
      if (s !== 0) return s
      return a.order.internalNumber - b.order.internalNumber
    })
    return filtered
  }, [orders, statusFilter])

  useEffect(() => {
    if (highlightId && flatItems.length > 0) {
      const el = document.getElementById(`order-${highlightId}`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        el.classList.add("ring-2", "ring-[#F59E0B]", "bg-[#F59E0B]/5")
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-[#F59E0B]", "bg-[#F59E0B]/5")
        }, 3000)
      }
    }
  }, [highlightId, flatItems])

  function addToCart(product: Product) {
    const existing = cart.find(c => c.productId === product.id)
    if (existing) {
      setCart(cart.map(c => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c))
      toast.success(`${product.name} — cantidad: ${existing.quantity + 1}`)
    } else {
      setCart([...cart, { productId: product.id, name: product.name, quantity: 1, priceUSD: product.priceUSD }])
      toast.success(`${product.name} agregado`)
    }
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter(c => c.productId !== productId))
  }

  const filteredProducts = products.filter(p => {
    const q = searchProd.toLowerCase().trim()
    if (!q) return true
    if (p.name.toLowerCase().includes(q)) return true
    if (p.category?.name?.toLowerCase().includes(q)) return true
    const num = parseFloat(q.replace(/[$,.]/g, ""))
    const isNumeric = !isNaN(num)
    if (isNumeric) {
      if (p.costUSDT === num) return true
      if (p.shippingCost === num) return true
      if (p.finalPriceUSD === num) return true
      if (p.finalPriceARS === num) return true
      if (p.stock === num) return true
    }
    if ((q === "disponible" || q === "si" || q === "sí") && p.isAvailable) return true
    if ((q === "no" || q === "oculto") && p.isAvailable === false) return true
    return false
  })

  const totalUSD = cart.reduce((sum, item) => sum + item.priceUSD * item.quantity, 0)

  async function handleCreateOrder() {
    if (!form.clientName || cart.length === 0) {
      toast.error("Completá nombre del cliente y agregá productos")
      return
    }
    setSaving(true)
    try {
      const bodyObj = {
        clientName: form.clientName,
        clientSurname: form.clientSurname,
        clientPhone: form.clientPhone,
        clientEmail: form.clientEmail,
        storeId: form.storeId || null,
        clientContact: form.clientContact,
        items: cart.map(c => ({ productId: c.productId, quantity: c.quantity, priceUSD: c.priceUSD })),
        totalUSD,
      }
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyObj),
      })
      if (!res.ok) {
        const text = await res.text()
        let errData: Record<string, unknown> = {}
        try { errData = JSON.parse(text) } catch {}
        throw new Error(String(errData.error || `Error ${res.status}`))
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

  async function handleDeleteOrder() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      const res = await fetch(`/api/pedidos/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al eliminar pedido")
      }
      toast.success("Pedido eliminado")
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
      fetchOrders()
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error al eliminar pedido") }
    finally { setSaving(false) }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Pedidos</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} pedidos — página {page} de {totalPages || 1}</p>
        </div>
        <div className="flex items-center gap-2">
          <PapeleraModal model="pedidos" sectionLabel="Pedidos" onRestore={fetchOrders} />
          <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Nuevo pedido
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v: string | null) => setStatusFilter(v === "all" ? "" : v || "")}>
            <SelectTrigger className="w-40 bg-muted border-border text-foreground">
              <SelectValue placeholder="Filtrar estado">{!statusFilter ? "Filtrar estado" : statusConfig[statusFilter]?.label || statusFilter}</SelectValue>
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
              <TableHead className="text-muted-foreground w-16 text-center">#</TableHead>
              <TableHead className="text-muted-foreground">Cliente</TableHead>
              <TableHead className="text-muted-foreground">Fecha</TableHead>
              <TableHead className="text-muted-foreground">Contacto</TableHead>
              <TableHead className="text-muted-foreground">Producto</TableHead>
              <TableHead className="text-muted-foreground text-right">Costo USDT</TableHead>
              <TableHead className="text-muted-foreground text-right">Logística</TableHead>
              <TableHead className="text-muted-foreground text-right">Envío ARS</TableHead>
              <TableHead className="text-muted-foreground text-right">Subtotal ARS</TableHead>
              <TableHead className="text-muted-foreground text-right">Ganancia ARS</TableHead>
              <TableHead className="text-muted-foreground text-right">Final ARS</TableHead>
              <TableHead className="text-muted-foreground text-right">Final USD</TableHead>
              <TableHead className="text-muted-foreground text-center">Tracking</TableHead>
              <TableHead className="text-muted-foreground text-center">Estado</TableHead>
              <TableHead className="text-muted-foreground text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={15} className="text-center text-muted-foreground py-12">Cargando...</TableCell></TableRow>
            ) : flatItems.length === 0 ? (
              <TableRow><TableCell colSpan={15} className="text-center text-muted-foreground py-12"><Package className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>Sin pedidos</p></TableCell></TableRow>
            ) : (
              flatItems.map(({ item, order }) => {
                const pricing = computeItemPricing(item, order.exchangeRate || exchangeRate, order.usdtRate || usdtRate)
                const payCfg = paymentConfig[order.paymentStatus] || paymentConfig.debe
                return (
                  <TableRow
                    id={`order-${item.id}`}
                    key={item.id}
                    className="border-border hover:bg-muted transition-all duration-1000"
                  >
                    <TableCell className="text-center text-xs text-muted-foreground font-mono cursor-pointer" onClick={() => handleProductDetail(item, order)}>
                      #{order.internalNumber}
                    </TableCell>
                    <TableCell className={`font-medium ${payCfg.className} cursor-pointer`} onClick={() => handleProductDetail(item, order)}>
                      {order.clientName} {order.clientSurname}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs cursor-pointer" onClick={() => handleProductDetail(item, order)}>
                      {new Date(order.createdAt).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm cursor-pointer" onClick={() => handleProductDetail(item, order)}>
                      {order.clientPhone || order.clientContact}
                    </TableCell>
                    <TableCell className="text-foreground text-sm cursor-pointer" onClick={() => handleProductDetail(item, order)}>
                      {item.productName ?? item.product?.name ?? "Producto eliminado"}
                      <span className="text-muted-foreground ml-1">×{item.quantity}</span>
                    </TableCell>
                    <TableCell className="text-right text-foreground text-sm cursor-pointer" onClick={() => handleProductDetail(item, order)}>
                      ${pricing.costUSDT.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm cursor-pointer" onClick={() => handleProductDetail(item, order)}>
                      {item.yoniEnabled ? `$${pricing.yoniUSDT.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm cursor-pointer" onClick={() => handleProductDetail(item, order)}>
                      ${pricing.shippingCost.toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell className="text-right text-foreground text-sm cursor-pointer" onClick={() => handleProductDetail(item, order)}>
                      ${pricing.subtotalARS.toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell className="text-right text-[#0071e3] text-sm cursor-pointer" onClick={() => handleProductDetail(item, order)}>
                      ${pricing.profitARS.toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell className="text-right text-[#22C55E] font-medium text-sm cursor-pointer" onClick={() => handleProductDetail(item, order)}>
                      ${pricing.finalPriceARS.toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm cursor-pointer" onClick={() => handleProductDetail(item, order)}>
                      ${pricing.finalPriceUSD.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground cursor-pointer" onClick={() => handleProductDetail(item, order)}>
                      {item.trackingCode ? (
                        <span className="text-blue-400">{item.trackingCode}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center cursor-pointer" onClick={() => handleProductDetail(item, order)}>
                      {getItemStatusBadge(item.shippingStatus)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteTarget(order); setDeleteDialogOpen(true) }} className="text-muted-foreground hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <Dialog open={!!productDetail} onOpenChange={(o) => { if (!o) setProductDetail(null) }}>
        <DialogContent className="bg-card text-foreground max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Detalle del pedido</DialogTitle>
              {productDetail && !editingOrder && (
                <Button variant="ghost" size="sm" onClick={() => startEditing(productDetail.order)} className="text-muted-foreground hover:text-foreground">
                  <Pencil className="w-4 h-4 mr-1" /> Editar
                </Button>
              )}
            </div>
          </DialogHeader>
          {productDetail && (() => {
            const order = productDetail.order
            const payCfg = paymentConfig[order.paymentStatus] || paymentConfig.debe
            const allPricing = order.items.map(i => ({
              item: i,
              pricing: computeItemPricing(i, order.exchangeRate || exchangeRate, order.usdtRate || usdtRate),
            }))
            const orderTotals = allPricing.reduce((acc, { pricing: p }) => ({
              totalUSD: Math.round((acc.totalUSD + p.finalPriceUSD) * 100) / 100,
              totalARS: acc.totalARS + p.finalPriceARS,
            }), { totalUSD: 0, totalARS: 0 })

            return (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      #{order.internalNumber} — <span className={payCfg.className}>{order.clientName} {order.clientSurname}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("es-AR", { dateStyle: "long" })}</p>
                  </div>
                  <Badge className={`${(statusConfig[order.status] || statusConfig.pending).className} border-0`}>
                    {(statusConfig[order.status] || statusConfig.pending).label}
                  </Badge>
                </div>

                {editingOrder ? (
                  <div className="space-y-3 border border-border rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-foreground">Editar pedido</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Nombre</Label>
                        <Input value={editForm.clientName} onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })} className="bg-muted border-border text-foreground" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Apellido</Label>
                        <Input value={editForm.clientSurname} onChange={(e) => setEditForm({ ...editForm, clientSurname: e.target.value })} className="bg-muted border-border text-foreground" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Teléfono</Label>
                        <Input value={editForm.clientPhone} onChange={(e) => setEditForm({ ...editForm, clientPhone: e.target.value })} className="bg-muted border-border text-foreground" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <Input type="email" value={editForm.clientEmail} onChange={(e) => setEditForm({ ...editForm, clientEmail: e.target.value })} className="bg-muted border-border text-foreground" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Contacto</Label>
                        <Input value={editForm.clientContact} onChange={(e) => setEditForm({ ...editForm, clientContact: e.target.value })} className="bg-muted border-border text-foreground" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Tienda</Label>
                        <Select value={editForm.storeId || "__none"} onValueChange={(v: string | null) => setEditForm({ ...editForm, storeId: v === "__none" ? "" : v || "" })}>
                          <SelectTrigger className="bg-muted border-border text-foreground">
                            <SelectValue placeholder="Seleccionar tienda" />
                          </SelectTrigger>
                          <SelectContent className="bg-card text-foreground">
                            <SelectItem value="__none">Sin tienda</SelectItem>
                            {stores.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Estado</Label>
                        <Select value={editForm.status} onValueChange={(v: string | null) => setEditForm({ ...editForm, status: v || "" })}>
                          <SelectTrigger className="bg-muted border-border text-foreground">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent className="bg-card text-foreground">
                            {Object.entries(statusConfig).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-xs text-muted-foreground">Notas</Label>
                        <textarea
                          value={editForm.notes}
                          onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                          className="w-full bg-muted border border-border rounded-lg p-2 text-sm text-foreground resize-none"
                          rows={3}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="ghost" onClick={() => setEditingOrder(false)} className="text-muted-foreground">Cancelar</Button>
                      <Button type="button" disabled={savingEdit} onClick={handleSaveEdit} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        {savingEdit ? "Guardando..." : "Guardar cambios"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><p className="text-muted-foreground">Teléfono</p><p className="text-foreground">{order.clientPhone || "—"}</p></div>
                      <div><p className="text-muted-foreground">Email</p><p className="text-foreground">{order.clientEmail || "—"}</p></div>
                      <div><p className="text-muted-foreground">Contacto</p><p className="text-foreground">{order.clientContact || "—"}</p></div>
                      <div><p className="text-muted-foreground">Tienda</p><p className="text-foreground">{order.store?.name || "—"}</p></div>
                    </div>

                    <div className="border border-border rounded-lg divide-y divide-border">
                      {allPricing.map(({ item: i, pricing: p }) => (
                        <div key={i.id} className="p-3 space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-foreground">{i.productName ?? i.product?.name ?? "Producto eliminado"} × {i.quantity}</span>
                            <span className="text-foreground">{formatUSD(i.priceUSD * i.quantity)}</span>
                          </div>
                          {i.bulk && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{courierLabel[i.bulk.courier] || i.bulk.courier}</span>
                              {i.bulk.trackingCode && <span className="text-blue-400">📍 {i.bulk.trackingCode}</span>}
                            </div>
                          )}
                          {i.bulkType && <p className="text-xs text-muted-foreground">Tipo bulto: {i.bulkType}</p>}
                          {getItemStatusBadge(i.shippingStatus)}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1.5 text-xs text-muted-foreground border-t border-border/50">
                            <span>Costo USDT: <span className="text-foreground">${p.costUSDT.toFixed(2)}</span></span>
                            <span>Logística: <span className="text-foreground">{i.yoniEnabled ? `$${p.yoniUSDT.toFixed(2)}` : "—"}</span></span>
                            <span>Envío ARS: <span className="text-foreground">${p.shippingCost.toLocaleString("es-AR")}</span></span>
                            <span>Subtotal ARS: <span className="text-foreground">${p.subtotalARS.toLocaleString("es-AR")}</span></span>
                            <span>Ganancia ARS: <span className="text-[#0071e3]">${p.profitARS.toLocaleString("es-AR")}</span></span>
                            <span>Final ARS: <span className="text-[#22C55E]">${p.finalPriceARS.toLocaleString("es-AR")}</span></span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border border-border rounded-lg p-4 space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">Totales del pedido</h3>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Total USD</span><span className="text-foreground font-medium">${orderTotals.totalUSD.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Total ARS</span><span className="text-[#22C55E] font-medium">${orderTotals.totalARS.toLocaleString("es-AR")}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Pagado</span><span className="text-[#22C55E]">${order.amountPaidUSD.toFixed(2)} USD</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Saldo pendiente</span><span className={orderTotals.totalUSD - order.amountPaidUSD > 0 ? "text-orange-400 font-medium" : "text-[#22C55E]"}>${Math.max(0, orderTotals.totalUSD - order.amountPaidUSD).toFixed(2)} USD</span></div>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">Estado de pago</h3>
                        <span className={`text-xs font-medium ${payCfg.className}`}>
                          {payCfg.label} — ${order.amountPaidUSD.toFixed(2)} / ${orderTotals.totalUSD.toFixed(2)} USD
                        </span>
                      </div>
                      <div className="flex items-end gap-3">
                        <div className="flex-1 space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Monto</Label>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            className="bg-muted border-border text-foreground"
                          />
                        </div>
                        <div className="w-24 space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Moneda</Label>
                          <Select value={paymentCurrency} onValueChange={(v) => v && setPaymentCurrency(v)}>
                            <SelectTrigger className="bg-muted border-border text-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card text-foreground">
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="ARS">ARS</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          disabled={savingPay || !paymentAmount || Number(paymentAmount) <= 0}
                          onClick={handleSavePayment}
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          {savingPay ? "Guardando..." : "Registrar pago"}
                        </Button>
                      </div>
                    </div>

                    {order.payments && order.payments.length > 0 && (
                      <div className="border-t border-border pt-4 space-y-2">
                        <h3 className="text-sm font-semibold text-foreground">Historial de pagos</h3>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {order.payments.map((p) => (
                            <div key={p.id} className="flex items-center justify-between text-xs bg-muted/30 rounded px-3 py-2">
                              <span className="text-muted-foreground">
                                {new Date(p.date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <span className="text-foreground font-medium">
                                {p.amountARS ? `$${p.amountARS.toLocaleString("es-AR")} ARS` : `$${p.amountUSD.toFixed(2)} USD`}
                              </span>
                              <span className="text-muted-foreground">{p.concept || "—"}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground text-right">
                          Total pagado: <span className="text-[#22C55E] font-medium">${order.amountPaidUSD.toFixed(2)} USD</span>
                        </p>
                      </div>
                    )}

                    {order.notes && (
                      <div className="border-t border-border pt-3">
                        <p className="text-xs text-muted-foreground mb-1">Notas</p>
                        <p className="text-sm text-foreground">{order.notes}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className=" bg-card text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo pedido</DialogTitle></DialogHeader>
          <form className="space-y-4">
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
              <Select value={form.storeId} onValueChange={(v: string | null) => setForm({ ...form, storeId: v === "__none" ? "" : v || "" })}>
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
                <Input value={searchProd} onChange={(e) => setSearchProd(e.target.value)} placeholder="Buscar por nombre, categoría, costos, stock, disponibilidad" className="pl-9 bg-muted border-border text-foreground" />
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
                <Button type="button" disabled={saving} onClick={handleCreateOrder} className="bg-primary hover:bg-primary/90 text-primary-foreground">{saving ? "Guardando..." : "Crear pedido"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={(o) => { if (!o) { setDeleteDialogOpen(false); setDeleteTarget(null) } }}>
        <DialogContent className="bg-card text-foreground max-w-sm">
          <DialogHeader><DialogTitle>Eliminar pedido</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Eliminar este pedido? Todos sus productos se eliminarán permanentemente.
          </p>
          {deleteTarget && (
            <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 space-y-1">
              <p><span className="text-foreground">Cliente:</span> {deleteTarget.clientName} {deleteTarget.clientSurname}</p>
              <p><span className="text-foreground">Total:</span> ${deleteTarget.totalUSD.toFixed(2)} USD</p>
              <p><span className="text-foreground">Productos:</span> {deleteTarget.items.length}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setDeleteDialogOpen(false); setDeleteTarget(null) }} className="text-muted-foreground">Cancelar</Button>
            <Button type="button" disabled={saving} onClick={handleDeleteOrder} className="bg-red-500 hover:bg-red-600 text-white">
              {saving ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}