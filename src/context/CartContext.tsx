"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"

export interface CartItem {
  slug: string
  color: string | null
  name: string
  price: number
  quantity: number
  image: string | null
  maxQuantity: number
}

function itemKey(item: { slug: string; color: string | null }) {
  return `${item.slug}__${item.color ?? ""}`
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity">) => void
  removeItem: (slug: string, color?: string | null) => void
  updateQuantity: (slug: string, quantity: number, color?: string | null) => void
  clearCart: () => void
  total: number
  count: number
}

const CartContext = createContext<CartContextType | null>(null)

const STORAGE_KEY = "lopedis_cart"

export function CartProvider({ children }: { children: ReactNode }) {
  // Se arranca vacío (igual en servidor y cliente) para no generar un mismatch
  // de hidratación en Next.js; el carrito guardado se carga después del montaje.
  const [items, setItems] = useState<CartItem[]>([])
  const hydrated = useRef(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setItems(JSON.parse(stored))
    } catch {
      // localStorage bloqueado/no disponible — seguimos con el carrito vacío
    }
    hydrated.current = true
  }, [])

  useEffect(() => {
    if (!hydrated.current) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Modo privado / storage lleno — no bloqueamos la UI por esto
    }
  }, [items])

  const addItem = useCallback((newItem: Omit<CartItem, "quantity">) => {
    if (newItem.maxQuantity <= 0) return
    setItems(prev => {
      const key = itemKey(newItem)
      const existing = prev.find(i => itemKey(i) === key)
      if (existing) {
        const nextQuantity = Math.min(existing.quantity + 1, newItem.maxQuantity)
        return prev.map(i => (itemKey(i) === key ? { ...i, quantity: nextQuantity, maxQuantity: newItem.maxQuantity } : i))
      }
      return [...prev, { ...newItem, quantity: 1 }]
    })
  }, [])

  const removeItem = useCallback((slug: string, color?: string | null) => {
    setItems(prev => prev.filter(i => !(i.slug === slug && (color === undefined || i.color === color))))
  }, [])

  const updateQuantity = useCallback((slug: string, quantity: number, color?: string | null) => {
    if (quantity <= 0) {
      removeItem(slug, color)
      return
    }
    setItems(prev => prev.map(i => (i.slug === slug && (color === undefined || i.color === color) ? { ...i, quantity: Math.min(quantity, i.maxQuantity) } : i)))
  }, [removeItem])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
