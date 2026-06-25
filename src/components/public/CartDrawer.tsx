"use client"

import { useState } from "react"
import { X, Plus, Minus, ShoppingBag, Trash2 } from "lucide-react"
import { useCart } from "@/context/CartContext"

interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, clearCart, total } = useCart()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", phone: "", address: "" })

  const whatsappNumber = "5491123456789"

  function buildMessage() {
    const lines: string[] = ["¡Hola! Quiero hacer un pedido:\n"]
    lines.push("🛒 *Productos:*")
    items.forEach((item, i) => {
      const subtotal = item.price * item.quantity
      lines.push(
        `${i + 1}. ${item.name} - $${item.price.toLocaleString("es-AR")} ARS x ${item.quantity} = $${subtotal.toLocaleString("es-AR")} ARS`
      )
    })
    lines.push(`\n💰 *Total:* $${total.toLocaleString("es-AR")} ARS`)
    lines.push(`\n👤 *Datos:*`)
    lines.push(`Nombre: ${form.name}`)
    lines.push(`Teléfono: ${form.phone}`)
    lines.push(`Dirección: ${form.address}`)
    lines.push("\n¡Gracias!")
    return lines.join("\n")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const msg = buildMessage()
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank")
    clearCart()
    setShowForm(false)
    onClose()
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 right-0 z-[70] h-full w-full sm:w-[420px] bg-white shadow-2xl transition-transform duration-300 flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#d2d2d7]/50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#0071e3]" />
            <h2 className="font-heading font-semibold text-[#1d1d1f] text-lg">Carrito</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#6e6e73]">
              <ShoppingBag className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">Tu carrito está vacío</p>
            </div>
          ) : (
            <>
              {items.map((item) => (
                <div key={item.slug} className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-xl">
                  <div className="w-14 h-14 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <ShoppingBag className="w-6 h-6 text-[#6e6e73]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1d1d1f] truncate">{item.name}</p>
                    <p className="text-xs text-[#6e6e73]">${item.price.toLocaleString("es-AR")} ARS c/u</p>
                    <p className="text-sm font-bold text-[#0071e3]">
                      ${(item.price * item.quantity).toLocaleString("es-AR")} ARS
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(item.slug, item.quantity - 1)}
                      className="p-1 rounded-full bg-white border border-[#d2d2d7]/60 text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium text-[#1d1d1f]">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.slug, item.quantity + 1)}
                      className="p-1 rounded-full bg-white border border-[#d2d2d7]/60 text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeItem(item.slug)}
                      className="p-1 ml-1 text-[#ff3b30] hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-3 pb-2 flex justify-between items-center border-t border-[#d2d2d7]/50">
                <span className="text-sm text-[#6e6e73]">Total</span>
                <span className="text-xl font-bold text-[#1d1d1f]">${total.toLocaleString("es-AR")} ARS</span>
              </div>
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-[#d2d2d7]/50 space-y-3">
            {!showForm ? (
              <>
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full py-3 bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-medium rounded-full transition-colors"
                >
                  Finalizar pedido
                </button>
                <button
                  onClick={clearCart}
                  className="w-full py-2 text-xs text-[#ff3b30] hover:text-red-600 transition-colors"
                >
                  Vaciar carrito
                </button>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full px-4 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7]/60 rounded-xl text-sm text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition-all"
                />
                <input
                  type="tel"
                  placeholder="Teléfono"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  required
                  className="w-full px-4 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7]/60 rounded-xl text-sm text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition-all"
                />
                <input
                  type="text"
                  placeholder="Dirección"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  required
                  className="w-full px-4 py-2.5 bg-[#f5f5f7] border border-[#d2d2d7]/60 rounded-xl text-sm text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition-all"
                />
                <button
                  type="submit"
                  className="w-full py-3 bg-[#34c759] hover:bg-[#28a745] text-white text-sm font-medium rounded-full transition-colors"
                >
                  Enviar pedido por WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="w-full py-2 text-xs text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
                >
                  Volver
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </>
  )
}
