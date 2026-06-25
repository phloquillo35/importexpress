"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

export interface CartItem {
  slug: string
  name: string
  price: number
  quantity: number
  image: string | null
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity">) => void
  removeItem: (slug: string) => void
  updateQuantity: (slug: string, quantity: number) => void
  clearCart: () => void
  total: number
  count: number
}

const CartContext = createContext<CartContextType | null>(null)

const STORAGE_KEY = "lopedis_cart"

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setItems(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback((newItem: Omit<CartItem, "quantity">) => {
    setItems(prev => {
      const existing = prev.find(i => i.slug === newItem.slug)
      if (existing) {
        return prev.map(i =>
          i.slug === newItem.slug ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...newItem, quantity: 1 }]
    })
  }, [])

  const removeItem = useCallback((slug: string) => {
    setItems(prev => prev.filter(i => i.slug !== slug))
  }, [])

  const updateQuantity = useCallback((slug: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(slug)
      return
    }
    setItems(prev => prev.map(i => (i.slug === slug ? { ...i, quantity } : i)))
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
