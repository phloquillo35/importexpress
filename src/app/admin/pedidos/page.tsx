"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Package, Plus, Search, Trash2, Pencil, ChevronLeft, ChevronRight, Loader2, MessageSquare, Calendar, Filter, X, DollarSign, Store, MoreHorizontal, ClipboardPaste } from "lucide-react"
import { PapeleraModal } from "@/components/papelera-modal"
import { toast } from "sonner"
import { formatUSD, formatARS } from "@/lib/utils"
import { formatWhatsAppDisplay } from "@/hooks/useWhatsAppConfig"
import { calculateFinalPrice } from "@/lib/pricing"
import { parseWhatsAppOrder, normalizeName, type ParsedOrder } from "@/lib/whatsapp-order-parser"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"

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
  color: string | null
  storage: string | null
  product?: {
    name: string
    slug: string
    images: string[] | { url: string; color: string }[]
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
  slug?: string
  priceUSD: number
  stock: number
  category?: { name: string; parent?: { name: string } | null } | null
  costUSDT?: number
  shippingCost?: number
  finalPriceUSD?: number
  finalPriceARS?: number
  isAvailable?: boolean
  images?: string[] | { url: string; color: string }[]
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

interface DetailDialogContentProps {
  productDetail: { item: OrderItem; order: Order }
  editingOrder: boolean
  activeTab: "items" | "payments" | "notes"
  setActiveTab: (tab: "items" | "payments" | "notes") => void
  editForm: { clientName: string; clientSurname: string; clientPhone: string; clientEmail: string; clientContact: string; storeId: string; status: string; notes: string }
  setEditForm: React.Dispatch<React.SetStateAction<{ clientName: string; clientSurname: string; clientPhone: string; clientEmail: string; clientContact: string; storeId: string; status: string; notes: string }>>
  savingEdit: boolean
  handleSaveEdit: () => Promise<void>
  paymentAmount: string
  setPaymentAmount: React.Dispatch<React.SetStateAction<string>>
  paymentCurrency: string
  setPaymentCurrency: React.Dispatch<React.SetStateAction<string>>
  savingPay: boolean
  handleSavePayment: () => Promise<void>
  startEditing: (order: Order) => void
  setEditingOrder: React.Dispatch<React.SetStateAction<boolean>>
  setWhatsappMessage: React.Dispatch<React.SetStateAction<string>>
  setWhatsappDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  toast: typeof import("sonner").toast
  formatUSD: (price: number | null | undefined) => string
  formatARS: (price: number) => string
  formatWhatsAppDisplay: (raw: string) => string
  statusConfig: Record<string, { label: string; className: string }>
  paymentConfig: Record<string, { label: string; className: string }>
  computeItemPricing: (item: OrderItem, exchangeRate: number, usdtRate: number) => { costUSDT: number; yoniUSDT: number; shippingCost: number; subtotalARS: number; profitARS: number; finalPriceARS: number; finalPriceUSD: number }
  exchangeRate: number
  usdtRate: number
  getItemStatusBadge: (status: string) => React.ReactElement
  courierLabel: Record<string, string>
  stores: StoreType[]
}

function DetailDialogContent({
  productDetail,
  editingOrder,
  activeTab,
  setActiveTab,
  editForm,
  setEditForm,
  savingEdit,
  handleSaveEdit,
  paymentAmount,
  setPaymentAmount,
  paymentCurrency,
  setPaymentCurrency,
  savingPay,
  handleSavePayment,
  startEditing,
  setEditingOrder,
  setWhatsappMessage,
  setWhatsappDialogOpen,
  toast,
  formatUSD,
  formatARS,
  formatWhatsAppDisplay,
  statusConfig,
  paymentConfig,
  computeItemPricing,
  exchangeRate,
  usdtRate,
  getItemStatusBadge,
  courierLabel,
  stores,
}: DetailDialogContentProps) {
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
    <>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle>Detalle del pedido</DialogTitle>
          <div className="flex items-center gap-2">
            {!editingOrder && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const phone = order.clientPhone || order.clientContact
                  if (!phone) {
                    toast.error("El cliente no tiene teléfono registrado")
                    return
                  }
                  const itemsText = order.items.map((item, i) => {
                    const displayName = item.productName ?? item.product?.name ?? "Producto"
                    return `${i + 1}. ${displayName} × ${item.quantity}${item.color ? ` (${item.color})` : ""}${item.storage ? ` [${item.storage}]` : ""}`
                  }).join("\n")
                  const message = `Hola ${order.clientName} ${order.clientSurname},\n\nTu pedido *#${order.internalNumber}*:\n${itemsText}\n\nEstado: ${statusConfig[order.status]?.label || order.status}\nTotal: ${formatUSD(orderTotals.totalUSD)} (${formatARS(orderTotals.totalARS)})\n\n¿En qué podemos ayudarte?`
                  setWhatsappMessage(message)
                  setWhatsappDialogOpen(true)
                }}
                className="text-[#25D366] hover:bg-[#25D366]/10 border-[#25D366]/30"
              >
                <MessageSquare className="w-4 h-4 mr-1" /> WhatsApp
              </Button>
            )}
            {!editingOrder && (
              <Button variant="ghost" size="sm" onClick={() => startEditing(order)} className="text-muted-foreground hover:text-foreground">
                <Pencil className="w-4 h-4 mr-1" /> Editar
              </Button>
            )}
            {editingOrder && (
              <Button variant="ghost" size="sm" onClick={() => setEditingOrder(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Button>
            )}
          </div>
        </div>
      </DialogHeader>
      <div className="flex-1 overflow-hidden">
        {editingOrder ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-3 border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-foreground">Editar pedido</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nombre</Label>
                  <Input value={editForm.clientName} onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })} className="w-full px-4 py-2.5 bg-muted border border-border/60 rounded-xl text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Apellido</Label>
                  <Input value={editForm.clientSurname} onChange={(e) => setEditForm({ ...editForm, clientSurname: e.target.value })} className="w-full px-4 py-2.5 bg-muted border border-border/60 rounded-xl text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Teléfono</Label>
                  <Input value={editForm.clientPhone} onChange={(e) => setEditForm({ ...editForm, clientPhone: e.target.value })} className="w-full px-4 py-2.5 bg-muted border border-border/60 rounded-xl text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input type="email" value={editForm.clientEmail} onChange={(e) => setEditForm({ ...editForm, clientEmail: e.target.value })} className="w-full px-4 py-2.5 bg-muted border border-border/60 rounded-xl text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Contacto</Label>
                  <Input value={editForm.clientContact} onChange={(e) => setEditForm({ ...editForm, clientContact: e.target.value })} className="w-full px-4 py-2.5 bg-muted border border-border/60 rounded-xl text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tienda</Label>
                  <Select value={editForm.storeId || "__none"} onValueChange={(v: string | null) => setEditForm({ ...editForm, storeId: v === "__none" ? "" : v || "" })}>
                    <SelectTrigger className="bg-muted border-border text-foreground">
                      <SelectValue placeholder="Seleccionar tienda">{(value) => !value ? "Seleccionar tienda" : value === "__none" ? "Sin tienda" : stores.find(s => s.id === value)?.name ?? value}</SelectValue>
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
                      <SelectValue placeholder="Seleccionar estado">{(value) => value ? statusConfig[value]?.label : "Seleccionar estado"}</SelectValue>
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
                  <Textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full px-4 py-2.5 bg-muted border border-border/60 rounded-xl text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
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
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 bg-muted">
              <TabsTrigger value="items">Items</TabsTrigger>
              <TabsTrigger value="payments">Pagos</TabsTrigger>
              <TabsTrigger value="notes">Notas</TabsTrigger>
            </TabsList>
            <TabsContent value="items" className="flex-1 overflow-y-auto p-4 space-y-4">
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

              {order.notes && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground mb-1">Notas</p>
                  <p className="text-sm text-foreground">{order.notes}</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="payments" className="flex-1 overflow-y-auto p-4 space-y-4">
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
                      className="w-full px-4 py-2.5 bg-muted border border-border/60 rounded-xl text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="w-24 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Moneda</Label>
                    <Select value={paymentCurrency} onValueChange={(v) => v && setPaymentCurrency(v as "USD" | "ARS")}>
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
            </TabsContent>
            <TabsContent value="notes" className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-3">
                {order.notes ? (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground mb-1">Notas del pedido</p>
                    <p className="text-sm text-foreground">{order.notes}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Sin notas</p>
                )}
                <div className="border-t border-border pt-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Agregar nota</h3>
                  <Textarea
                    placeholder="Escribir nota interna..."
                    className="w-full px-4 py-2.5 bg-muted border border-border/60 rounded-xl text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    rows={3}
                  />
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
                    Guardar nota
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  )
}

export default function PedidosPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "")
  const [dialogOpen, setDialogOpen] = useState(false)
  // Product search states (server-side with pagination)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searchPage, setSearchPage] = useState(1)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchHasMore, setSearchHasMore] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  // Cart with color and storage
  const [cart, setCart] = useState<{ productId: string; name: string; quantity: number; priceUSD: number; color?: string; storage?: string }[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [form, setForm] = useState({ clientName: "", clientSurname: "", clientPhone: "", clientEmail: "", storeId: "", clientContact: "", notes: "" })
  const [saving, setSaving] = useState(false)
  // WhatsApp order reader (paste message from client)
  const [readerOpen, setReaderOpen] = useState(false)
  const [readerText, setReaderText] = useState("")
  const [readerParsed, setReaderParsed] = useState<ParsedOrder | null>(null)
  const [readerMatched, setReaderMatched] = useState<{ parsed: ParsedOrder["items"][number]; product: Product | null }[]>([])
  const [readerChecking, setReaderChecking] = useState(false)
  const [exchangeRate, setExchangeRate] = useState(1)
  const [usdtRate, setUsdtRate] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null)
  const [deleteItemTarget, setDeleteItemTarget] = useState<{ item: OrderItem; order: Order } | null>(null)
  const [groupDeleteOpen, setGroupDeleteOpen] = useState(false)
  const [productDetail, setProductDetail] = useState<{ item: OrderItem; order: Order } | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentCurrency, setPaymentCurrency] = useState("USD")
  const [savingPay, setSavingPay] = useState(false)
  const [editingOrder, setEditingOrder] = useState(false)
  const [editForm, setEditForm] = useState({ clientName: "", clientSurname: "", clientPhone: "", clientEmail: "", clientContact: "", storeId: "", status: "", notes: "" })
  const [savingEdit, setSavingEdit] = useState(false)
  const highlightId = searchParams.get("highlight")
  const tableRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 50

  // WhatsApp dialog state
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false)
  const [whatsappMessage, setWhatsappMessage] = useState("")
  const [whatsappSending, setWhatsappSending] = useState(false)

  // Tabs state for detail dialog
  const [activeTab, setActiveTab] = useState<"items" | "payments" | "notes">("items")

  // Search + status filter state
  const [searchFilter, setSearchFilter] = useState(searchParams.get("search") || "")

  // Color/Storage selection for product being added
  const [selectedProductColor, setSelectedProductColor] = useState<string>("")
  const [selectedProductStorage, setSelectedProductStorage] = useState<string>("")
  const [selectedProductForColor, setSelectedProductForColor] = useState<Product | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", String(limit))
      if (statusFilter) params.set("status", statusFilter)
      if (searchFilter) params.set("search", searchFilter)
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
  }, [page, statusFilter, searchFilter])

  useEffect(() => {
    let cancelled = false
    async function fetchOrdersEffect() {
      try {
        const params = new URLSearchParams()
        params.set("page", String(page))
        params.set("limit", String(limit))
        if (statusFilter) params.set("status", statusFilter)
        if (searchFilter) params.set("search", searchFilter)
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
  }, [page, statusFilter, searchFilter])

  // Sync filters to URL when they change (status immediate, search debounced)
  useEffect(() => {
    const params = new URLSearchParams()
    if (statusFilter) params.set("status", statusFilter)
    if (searchFilter) params.set("search", searchFilter)
    const qs = params.toString()
    router.push(`/admin/pedidos${qs ? `?${qs}` : ""}`, { scroll: false })
  }, [router, statusFilter, searchFilter])

  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const handleSearchFilterChange = (value: string) => {
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current)
    filterDebounceRef.current = setTimeout(() => {
      setSearchFilter(value)
      setPage(1)
    }, 300)
  }

  // Cleanup filter debounce on unmount
  useEffect(() => {
    return () => {
      if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current)
    }
  }, [])

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
    fetch("/api/tiendas").then(r => r.json()).then(d => setStores(Array.isArray(d) ? d : [])).catch(() => toast.error("Error al cargar tiendas"))
    fetch("/api/configuracion").then(r => r.json()).then(data => {
      setExchangeRate(Number(data.exchange_rate) || 1)
      setUsdtRate(Number(data.usdt_rate) || 1)
    }).catch(() => {})
  }, [])

  // Search functions for server-side product search with pagination
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setSearchPage(1) // Reset to first page on new search
    setSearchHasMore(true)

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Debounce 300ms before hitting the API
    debounceRef.current = setTimeout(() => {
      searchProducts(query, 1)
    }, 300)
  }

  const searchProducts = async (query: string, page: number) => {
    // Empty query: clear results and stop
    if (!query.trim()) {
      setSearchResults([])
      setSearchHasMore(false)
      return
    }

    setSearchLoading(true)
    try {
      const res = await fetch(`/api/productos?admin=1&search=${encodeURIComponent(query)}&page=${page}&limit=50`)
      if (!res.ok) {
        throw new Error("Error al buscar productos")
      }
      const data = await res.json()
      const products: Product[] = data.products || []

      // First page replaces results; subsequent pages append
      if (page === 1) {
        setSearchResults(products)
      } else {
        setSearchResults(prev => [...prev, ...products])
      }

      // More pages exist if current page < total pages
      setSearchHasMore(data.page < data.totalPages)
    } catch (err) {
      console.error(err)
      toast.error("Error al buscar productos")
      setSearchHasMore(false)
    } finally {
      setSearchLoading(false)
    }
  }

  const loadMoreSearch = () => {
    const nextPage = searchPage + 1
    setSearchPage(nextPage)
    searchProducts(searchQuery, nextPage)
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
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

  function addToCart(product: Product, color?: string, storage?: string) {
    const existing = cart.find(c => c.productId === product.id && c.color === color && c.storage === storage)
    setCart(prev => {
      const has = prev.find(c => c.productId === product.id && c.color === color && c.storage === storage)
      if (has) {
        return prev.map(c => c.productId === product.id && c.color === color && c.storage === storage ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, { productId: product.id, name: product.name, quantity: 1, priceUSD: product.priceUSD, color, storage }]
    })
    if (existing) {
      toast.success(`${product.name} — cantidad: ${existing.quantity + 1}`)
    } else {
      toast.success(`${product.name} agregado`)
    }
  }

  function removeFromCart(productId: string, color?: string, storage?: string) {
    setCart(prev => prev.filter(c => !(c.productId === productId && c.color === color && c.storage === storage)))
  }

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
        notes: form.notes || null,
        items: cart.map(c => ({ productId: c.productId, quantity: c.quantity, priceUSD: c.priceUSD, color: c.color, storage: c.storage })),
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
      setForm({ clientName: "", clientSurname: "", clientPhone: "", clientEmail: "", storeId: "", clientContact: "", notes: "" })
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

  async function handleDeleteItem() {
    if (!deleteItemTarget) return
    setSaving(true)
    try {
      const { order, item } = deleteItemTarget
      const res = await fetch(`/api/pedidos/${order.id}/items/${item.id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al eliminar producto del pedido")
      }
      toast.success("Producto eliminado del pedido")
      setDeleteItemTarget(null)
      fetchOrders()
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error al eliminar producto del pedido") }
    finally { setSaving(false) }
  }

  async function handleReaderParse() {
    if (!readerText.trim()) {
      toast.error("Pegá el mensaje de WhatsApp primero")
      return
    }
    const parsed = parseWhatsAppOrder(readerText)
    if (parsed.items.length === 0) {
      toast.error("No se pudieron detectar productos en el mensaje")
      return
    }
    setReaderParsed(parsed)
    setReaderChecking(true)
    try {
      const matched = await Promise.all(
        parsed.items.map(async (item) => {
          const product = await matchReaderItem(item)
          return { parsed: item, product }
        })
      )
      setReaderMatched(matched)
    } catch {
      toast.error("Error al buscar productos")
      setReaderMatched(parsed.items.map((item) => ({ parsed: item, product: null })))
    } finally {
      setReaderChecking(false)
    }
  }

  async function matchReaderItem(item: ParsedOrder["items"][number]): Promise<Product | null> {
    // 1. Por slug (identificador único del link del mensaje)
    if (item.slug) {
      const slugRes = await fetch(`/api/productos?admin=1&search=${encodeURIComponent(item.slug)}&limit=10`)
      if (slugRes.ok) {
        const slugData = await slugRes.json()
        const bySlug = (slugData.products || []).find((p: Product) => (p.slug || "").toLowerCase() === item.slug!.toLowerCase())
        if (bySlug) return bySlug
      }
    }
    // 2. Por nombre normalizado (quita acentos, mayúsculas y sufijos tipo "- Negro")
    const searchName = item.name.split(" - ")[0].trim()
    if (searchName) {
      const nameRes = await fetch(`/api/productos?admin=1&search=${encodeURIComponent(searchName)}&limit=10`)
      if (nameRes.ok) {
        const nameData = await nameRes.json()
        const normalizedItem = normalizeName(item.name)
        const byName = (nameData.products || []).find((p: Product) => normalizeName(p.name || "") === normalizedItem)
        if (byName) return byName
      }
    }
    return null
  }

  function handleReaderConfirm() {
    if (!readerParsed) return
    setForm({
      clientName: readerParsed.clientName,
      clientSurname: readerParsed.clientSurname,
      clientPhone: readerParsed.clientPhone,
      clientEmail: readerParsed.clientEmail,
      storeId: "",
      clientContact: readerParsed.clientPhone,
      notes: readerParsed.address ? `Dirección: ${readerParsed.address}` : "",
    })
    setCart(prev => {
      let next = [...prev]
      for (const { parsed, product } of readerMatched) {
        if (!product) continue
        const idx = next.findIndex(c => c.productId === product.id && !c.color && !c.storage)
        if (idx >= 0) {
          next[idx] = { ...next[idx], quantity: next[idx].quantity + parsed.quantity }
        } else {
          next = [...next, { productId: product.id, name: product.name, quantity: parsed.quantity, priceUSD: product.priceUSD }]
        }
      }
      return next
    })
    setReaderOpen(false)
    setReaderText("")
    setReaderParsed(null)
    setReaderMatched([])
    setDialogOpen(true)
    toast.success("Pedido precargado — revisá y crealo")
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
          <Button variant="outline" onClick={() => setReaderOpen(true)} className="text-muted-foreground hover:text-foreground">
            <ClipboardPaste className="w-4 h-4 mr-2" /> Pegar pedido de WhatsApp
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Nuevo pedido
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-md cursor-text">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchFilter}
              onChange={(e) => handleSearchFilterChange(e.target.value)}
              placeholder="Buscar por cliente, teléfono, #pedido, producto, tienda, estado..."
              className="pl-9 w-full px-4 py-2.5 bg-muted border border-border/60 rounded-xl text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => { setSearchFilter(""); setPage(1) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v: string | null) => { setStatusFilter(v === "all" ? "" : v || ""); setPage(1) }}>
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

          {/* Clear Filters */}
          {(statusFilter || searchFilter) && (
            <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(""); setSearchFilter(""); setPage(1) }} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4 mr-1" /> Limpiar
            </Button>
          )}

          {/* Delete order */}
          <Button variant="outline" onClick={() => setGroupDeleteOpen(true)} className="text-red-400 hover:text-red-500 hover:border-red-400/50">
            <Trash2 className="w-4 h-4 mr-2" /> Eliminar pedido
          </Button>
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
                      <span className="block max-w-[180px] truncate" title={(item.productName ?? item.product?.name ?? "Producto eliminado")}>
                        {(item.productName ?? item.product?.name ?? "Producto eliminado").split(" / ")[0]}
                      </span>
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
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteItemTarget({ item, order }) }} className="text-muted-foreground hover:text-red-400">
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

      {/* Detail Dialog */}
      {productDetail && (
        <Dialog open onOpenChange={(o) => { if (!o) { setProductDetail(null); setActiveTab("items") } }}>
          <DialogContent className="bg-card text-foreground max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DetailDialogContent
              productDetail={productDetail}
              editingOrder={editingOrder}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              editForm={editForm}
              setEditForm={setEditForm}
              savingEdit={savingEdit}
              handleSaveEdit={handleSaveEdit}
              paymentAmount={paymentAmount}
              setPaymentAmount={setPaymentAmount}
              paymentCurrency={paymentCurrency}
              setPaymentCurrency={setPaymentCurrency}
              savingPay={savingPay}
              handleSavePayment={handleSavePayment}
              startEditing={startEditing}
              setEditingOrder={setEditingOrder}
              setWhatsappMessage={setWhatsappMessage}
              setWhatsappDialogOpen={setWhatsappDialogOpen}
              toast={toast}
              formatUSD={formatUSD}
              formatARS={formatARS}
              formatWhatsAppDisplay={formatWhatsAppDisplay}
              statusConfig={statusConfig}
              paymentConfig={paymentConfig}
              computeItemPricing={computeItemPricing}
              exchangeRate={exchangeRate}
              usdtRate={usdtRate}
              getItemStatusBadge={getItemStatusBadge}
              courierLabel={courierLabel}
              stores={stores}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* WhatsApp order reader Dialog */}
      <Dialog open={readerOpen} onOpenChange={setReaderOpen}>
        <DialogContent className="bg-card text-foreground max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Pegar pedido de WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
            <p className="text-sm text-muted-foreground">
              Pegá el mensaje que te envió el cliente por WhatsApp (el que genera el carrito o la página de producto). Se detectarán sus datos y los productos automáticamente.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mensaje de WhatsApp</Label>
              <Textarea
                value={readerText}
                onChange={(e) => { setReaderText(e.target.value); setReaderParsed(null); setReaderMatched([]) }}
                rows={8}
                placeholder="Pegá acá el mensaje del cliente..."
                className="bg-muted border-border text-foreground placeholder-muted-foreground"
              />
            </div>
            <Button type="button" onClick={handleReaderParse} disabled={readerChecking} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {readerChecking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Detectar pedido
            </Button>

            {readerParsed && (
              <div className="space-y-3 border border-border rounded-lg p-3">
                <p className="text-sm font-semibold text-foreground">Pedido detectado</p>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  <p><span className="text-foreground">Nombre:</span> {readerParsed.clientName} {readerParsed.clientSurname}</p>
                  {readerParsed.clientPhone && <p><span className="text-foreground">Teléfono:</span> {readerParsed.clientPhone}</p>}
                  {readerParsed.clientEmail && <p><span className="text-foreground">Email:</span> {readerParsed.clientEmail}</p>}
                  {readerParsed.address && <p><span className="text-foreground">Dirección:</span> {readerParsed.address}</p>}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Productos</p>
                  {readerMatched.map(({ parsed, product }, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-muted-foreground">{parsed.name} × {parsed.quantity}</span>
                      {product ? (
                        <span className="text-[#22C55E] text-xs shrink-0 whitespace-nowrap">✓ En catálogo</span>
                      ) : (
                        <span className="text-red-400 text-xs shrink-0 whitespace-nowrap">✗ Sin match</span>
                      )}
                    </div>
                  ))}
                </div>
                {readerMatched.some(({ product }) => !product) && (
                  <p className="text-xs text-red-400">
                    Algunos productos no se encontraron en el catálogo. Se precargará el pedido solo con los que sí están.
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-border shrink-0">
            <Button type="button" variant="ghost" onClick={() => setReaderOpen(false)} className="text-muted-foreground">Cancelar</Button>
            <Button type="button" disabled={!readerParsed || readerChecking} onClick={handleReaderConfirm} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Precargar pedido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nuevo pedido Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card text-foreground max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Nuevo pedido</DialogTitle>
          </DialogHeader>
          <form className="flex-1 min-h-0 flex flex-col">
            <div className="space-y-3 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nombre</Label>
                  <Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className="w-full px-4 py-2.5 bg-muted border border-border/60 rounded-xl text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Apellido</Label>
                  <Input value={form.clientSurname} onChange={(e) => setForm({ ...form, clientSurname: e.target.value })} className="w-full px-4 py-2.5 bg-muted border border-border/60 rounded-xl text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Teléfono</Label>
                  <Input value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} className="w-full px-4 py-2.5 bg-muted border border-border/60 rounded-xl text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input type="email" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} className="w-full px-4 py-2.5 bg-muted border border-border/60 rounded-xl text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tienda</Label>
                <Select value={form.storeId} onValueChange={(v: string | null) => setForm({ ...form, storeId: v === "__none" ? "" : v || "" })}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue placeholder="Seleccionar tienda">{(value) => !value ? "Seleccionar tienda" : value === "__none" ? "Sin tienda" : stores.find(s => s.id === value)?.name ?? value}</SelectValue>
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
                <Label className="text-xs text-muted-foreground">Dirección / Notas</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Dirección de entrega o notas..."
                  className="bg-muted border-border text-foreground placeholder-muted-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Productos</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Buscar por nombre, marca, categoría, precio, stock..."
                    className="pl-9 w-full px-4 py-2.5 bg-muted border border-border/60 rounded-xl text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    autoFocus
                  />
                  {searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />}
                </div>
              </div>

<div className="max-h-40 overflow-y-auto rounded-lg border border-border">
                {searchResults.map((p) => {
                  const displayName = p.name.split(" / ")[0]
                  // Extract colors from images
                  const colors = Array.isArray(p.images)
                    ? [...new Set(p.images.filter((img): img is { url: string; color: string } => {
                        if (typeof img !== "object" || img === null) return false
                        if (!("color" in img)) return false
                        const color = img.color
                        return typeof color === "string" && color.length > 0
                      }).map(img => img.color))]
                    : []
                  const hasColors = colors.length > 0
                  const showColorSelector = hasColors && selectedProductForColor?.id === p.id
                  return (
                    <div key={p.id} className="border-b border-border last:border-b-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (hasColors && selectedProductForColor?.id !== p.id) {
                            setSelectedProductForColor(p)
                            setSelectedProductColor("")
                            setSelectedProductStorage("")
                          } else if (!hasColors) {
                            addToCart(p)
                          }
                        }}
                        className="w-full text-left px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors flex items-center justify-between gap-2"
                      >
                        <span className="truncate" title={p.name}>
                          {displayName}
                        </span>
                        <span className="text-muted-foreground text-xs whitespace-nowrap shrink-0">{formatUSD(p.priceUSD)}</span>
                      </button>
                      {showColorSelector && (
                        <div className="px-3 py-2 space-y-2 bg-muted/30">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Color</Label>
                              <Select value={selectedProductColor} onValueChange={(v) => v && setSelectedProductColor(v)}>
                                <SelectTrigger className="bg-muted border-border text-foreground">
                                  <SelectValue placeholder="Seleccionar color">{(value) => value ? value : "Seleccionar color"}</SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-card text-foreground">
                                  {colors.map((color) => (
                                    <SelectItem key={color} value={color}>{color}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Almacenamiento</Label>
                              <Input
                                type="text"
                                value={selectedProductStorage}
                                onChange={(e) => setSelectedProductStorage(e.target.value)}
                                placeholder="Ej: 128GB, 256GB"
                                className="w-full px-4 py-2.5 bg-muted border border-border/60 rounded-xl text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                              />
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={() => {
                              addToCart(p, selectedProductColor || undefined, selectedProductStorage || undefined)
                              setSelectedProductForColor(null)
                              setSelectedProductColor("")
                              setSelectedProductStorage("")
                            }}
                            disabled={hasColors && !selectedProductColor}
                          >
                            Agregar al pedido
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {searchHasMore && (
                  <button type="button" onClick={loadMoreSearch} className="w-full text-center py-2 text-sm text-primary hover:underline">
                    Cargar más resultados...
                  </button>
                )}
                {!searchLoading && searchQuery && searchResults.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">Sin resultados para &quot;{searchQuery}&quot;</p>
                )}
              </div>

              {cart.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 max-h-40 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={`${item.productId}-${item.color || ""}-${item.storage || ""}`} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-muted-foreground">
                        {item.name} × {item.quantity}
                        {item.color && <span className="ml-1 text-xs text-primary">({item.color})</span>}
                        {item.storage && <span className="ml-1 text-xs text-[#0071e3]">[{item.storage}]</span>}
                      </span>
                      <button type="button" onClick={() => removeFromCart(item.productId, item.color, item.storage)} className="text-red-400 text-xs hover:text-red-300 whitespace-nowrap shrink-0">Quitar</button>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 flex justify-between font-medium">
                    <span className="text-foreground">Total</span>
                    <span className="text-[#F59E0B]">{formatUSD(totalUSD)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 mt-3 border-t border-border shrink-0">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">Cancelar</Button>
                <Button type="button" disabled={saving} onClick={handleCreateOrder} className="bg-primary hover:bg-primary/90 text-primary-foreground" data-testid="guardar-pedido">{saving ? "Guardando..." : "Crear pedido"}</Button>
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

      <Dialog open={groupDeleteOpen} onOpenChange={setGroupDeleteOpen}>
        <DialogContent className="bg-card text-foreground max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Eliminar pedido</DialogTitle></DialogHeader>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay pedidos para eliminar</p>
          ) : (
            (() => {
              const grouped = new Map<string, Order[]>()
              for (const order of orders) {
                const key = `${order.clientName}|${order.clientSurname}|${order.clientPhone || order.clientContact}`
                if (!grouped.has(key)) grouped.set(key, [])
                grouped.get(key)!.push(order)
              }
              return Array.from(grouped.entries()).map(([key, userOrders]) => {
                const first = userOrders[0]
                return (
                  <div key={key} className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">
                      {first.clientName} {first.clientSurname} — {first.clientPhone || first.clientContact}
                    </p>
                    <div className="space-y-2">
                      {userOrders.map((order) => (
                        <div key={order.id} className="border border-border rounded-lg p-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-foreground">
                              #{order.internalNumber} — {new Date(order.createdAt).toLocaleDateString("es-AR")}
                            </span>
                            <span className="text-sm text-foreground">${order.totalUSD.toFixed(2)} USD</span>
                          </div>
                          <div className="space-y-0.5">
                            {order.items.map((item) => (
                              <p key={item.id} className="text-xs text-muted-foreground">
                                {item.productName ?? item.product?.name ?? "Producto eliminado"} ×{item.quantity}
                              </p>
                            ))}
                          </div>
                          <div className="flex justify-end">
                            <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(order); setDeleteDialogOpen(true) }} className="text-red-400 hover:text-red-500">
                              <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            })()
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteItemTarget !== null} onOpenChange={(o) => { if (!o) setDeleteItemTarget(null) }}>
        <DialogContent className="bg-card text-foreground max-w-sm">
          <DialogHeader><DialogTitle>¿Eliminar producto del pedido?</DialogTitle></DialogHeader>
          {deleteItemTarget && (
            <p className="text-sm text-muted-foreground">
              Se eliminará {deleteItemTarget.item.productName ?? deleteItemTarget.item.product?.name ?? "Producto"} ×{deleteItemTarget.item.quantity} del pedido #{deleteItemTarget.order.internalNumber}. El stock se restaura automáticamente.
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setDeleteItemTarget(null)} className="text-muted-foreground">Cancelar</Button>
            <Button type="button" disabled={saving} onClick={handleDeleteItem} className="bg-red-500 hover:bg-red-600 text-white">
              {saving ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Dialog */}
      <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
        <DialogContent className="bg-card text-foreground max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Enviar WhatsApp al cliente</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Mensaje</Label>
              <Textarea
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                className="w-full px-4 py-2.5 bg-muted border border-border/60 rounded-xl text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                rows={10}
                placeholder="Escribe tu mensaje..."
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Se abrirá WhatsApp Web con el mensaje pre-cargado. El número del cliente: {productDetail ? formatWhatsAppDisplay(productDetail.order.clientPhone || productDetail.order.clientContact) : "—"}
            </p>
          </div>
          <div className="flex justify-end gap-3 p-4 border-t border-border shrink-0">
            <Button type="button" variant="ghost" onClick={() => setWhatsappDialogOpen(false)} className="text-muted-foreground">Cancelar</Button>
            <Button
              type="button"
              disabled={whatsappSending || !whatsappMessage.trim()}
              onClick={() => {
                if (!productDetail) return
                const phone = productDetail.order.clientPhone || productDetail.order.clientContact
                if (!phone) {
                  toast.error("El cliente no tiene teléfono registrado")
                  return
                }
                const digits = phone.replace(/\D/g, "")
                const url = `https://wa.me/${digits}?text=${encodeURIComponent(whatsappMessage)}`
                window.open(url, "_blank")
                setWhatsappDialogOpen(false)
              }}
              className="bg-[#25D366] hover:bg-[#25D366]/90 text-white"
            >
              <MessageSquare className="w-4 h-4 mr-1" /> Abrir WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}