"use client"

import { useState } from "react"
import Link from "next/link"
import { MessageCircle, Menu, X, ShoppingBag } from "lucide-react"
import { useCart } from "@/context/CartContext"
import { CartDrawer } from "./CartDrawer"

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const { count } = useCart()

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-[#d2d2d7]/50 rounded-b-2xl">
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between h-12 lg:h-14">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <img src="/logo.jpg" alt="Lo Pedís, Lo Tenes" className="w-7 h-7 rounded-lg object-cover" />
              <span className="font-heading font-semibold text-[#1d1d1f] text-sm">Lo Pedís, Lo Tenes</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="/productos" className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors font-medium">
                Productos
              </Link>
              <Link href="/como-funciona" className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors font-medium">
                Cómo funciona
              </Link>
              <Link href="/contacto" className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors font-medium">
                Contacto
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2 text-[#1d1d1f] hover:text-[#0071e3] transition-colors"
                aria-label="Carrito"
              >
                <ShoppingBag className="w-5 h-5" />
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#0071e3] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </button>
              <a
                href="https://wa.me/5491123456789"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-medium rounded-full transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 text-[#1d1d1f] hover:text-[#0071e3] transition-colors"
                aria-label="Menú"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-[#d2d2d7]/50 bg-white/90 backdrop-blur-xl rounded-b-2xl overflow-hidden">
            <div className="px-4 py-4 space-y-1">
              <Link
                href="/productos"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 text-sm text-[#1d1d1f] hover:text-[#0071e3] font-medium rounded-xl hover:bg-[#f5f5f7] transition-colors"
              >
                Productos
              </Link>
              <Link
                href="/como-funciona"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 text-sm text-[#1d1d1f] hover:text-[#0071e3] font-medium rounded-xl hover:bg-[#f5f5f7] transition-colors"
              >
                Cómo funciona
              </Link>
              <Link
                href="/contacto"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 text-sm text-[#1d1d1f] hover:text-[#0071e3] font-medium rounded-xl hover:bg-[#f5f5f7] transition-colors"
              >
                Contacto
              </Link>
            </div>
          </div>
        )}
      </nav>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}
