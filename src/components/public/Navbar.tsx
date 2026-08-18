"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import { MessageCircle, Menu, X, ShoppingBag, Sun, Moon, Search } from "lucide-react"
import { useTheme } from "next-themes"
import { useCart } from "@/context/CartContext"
import { lockScroll, unlockScroll } from "@/lib/utils"
import { CartDrawer } from "./CartDrawer"
import { HeroSidebar } from "./HeroSidebar"
import { WhatsAppAgentSelector } from "./WhatsAppAgentSelector"

interface Category {
  id: string
  name: string
  slug: string
  parent: { id: string; name: string; slug: string } | null
  _count: { products: number }
  children: { id: string; name: string; slug: string; _count: { products: number } }[]
}

export function Navbar({ initialCategories }: { initialCategories?: Category[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const isProductos = pathname.startsWith("/productos")
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [whatsAppOpen, setWhatsAppOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  )
  const { count } = useCart()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (menuOpen || cartOpen) {
      lockScroll()
      return unlockScroll
    }
  }, [menuOpen, cartOpen])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <>
      <nav className="sticky top-0 z-50 bg-background/70 dark:bg-background/85 backdrop-blur-xl border-b border-border/50 rounded-b-2xl overflow-hidden pt-[env(safe-area-inset-top)] touch-manipulation">
        <div className="px-4 sm:px-6">
          {/* Mobile */}
          <div className="flex md:hidden items-center justify-between h-12">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center justify-center min-w-11 min-h-11 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Menú"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link href="/" className="flex items-center gap-2 flex-1 justify-center">
              <Image src="/logo.jpg" alt="Lo Pedís, Lo Tenes" width={28} height={28} className="rounded-lg object-cover" />
              <span className="font-heading font-semibold text-foreground text-sm">Lo Pedís, Lo Tenes</span>
            </Link>

            <button
              onClick={() => setWhatsAppOpen(true)}
              className="flex items-center justify-center w-11 h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full transition-colors cursor-pointer"
              aria-label="Contactar por WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>

          {/* Desktop */}
          <div className="hidden md:flex items-center justify-between h-12 lg:h-14">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image src="/logo.jpg" alt="Lo Pedís, Lo Tenes" width={28} height={28} className="rounded-lg object-cover" />
              <span className="font-heading font-semibold text-foreground text-sm">Lo Pedís, Lo Tenes</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="/productos" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium cursor-pointer">
                Productos
              </Link>
              <Link href="/como-funciona" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium cursor-pointer">
                Cómo funciona
              </Link>
              <Link href="/contacto" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium cursor-pointer">
                Contacto
              </Link>
            </div>

            {!isProductos && (
              <form
                onSubmit={(e) => { e.preventDefault(); router.push(`/productos?search=${encodeURIComponent(search)}`); setSearch("") }}
                className="hidden md:flex items-center flex-1 max-w-xs mx-4"
              >
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar productos..."
                    className="w-full pl-9 pr-4 py-2 bg-muted border border-border/60 rounded-full text-[16px] lg:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition-all"
                  />
                </div>
              </form>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center justify-center min-w-11 min-h-11 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setCartOpen(true)}
                className="relative flex items-center justify-center min-w-11 min-h-11 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Carrito"
                data-testid="cart-trigger"
              >
                <ShoppingBag className="w-5 h-5" />
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </button>
              <button
                onClick={() => setWhatsAppOpen(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-full transition-colors cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-border/50 bg-background/90 dark:bg-background/95 backdrop-blur-xl rounded-b-2xl overflow-y-auto overscroll-contain max-h-[calc(100vh-3rem)] max-h-[calc(100dvh-3rem)]">
            <form
              onSubmit={(e) => { e.preventDefault(); router.push(`/productos?search=${encodeURIComponent(search)}`); setSearch(""); setMenuOpen(false) }}
              className="px-4 pt-3"
            >
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar productos..."
                  className="w-full pl-9 pr-4 py-2.5 bg-muted border border-border/60 rounded-full text-[16px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition-all"
                />
              </div>
            </form>

            <div className="px-4 py-4 space-y-1">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-foreground rounded-xl hover:bg-muted transition-colors cursor-pointer"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                {theme === "dark" ? "Modo claro" : "Modo oscuro"}
              </button>
            </div>

            <div className="border-t border-border/50 px-4 py-3 space-y-1">
              <Link
                href="/productos"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 text-sm text-foreground hover:text-primary font-medium rounded-xl hover:bg-muted transition-colors cursor-pointer"
              >
                Productos
              </Link>
              <Link
                href="/como-funciona"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 text-sm text-foreground hover:text-primary font-medium rounded-xl hover:bg-muted transition-colors cursor-pointer"
              >
                Cómo funciona
              </Link>
              <Link
                href="/contacto"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 text-sm text-foreground hover:text-primary font-medium rounded-xl hover:bg-muted transition-colors cursor-pointer"
              >
                Contacto
              </Link>
            </div>

            <div className="border-t border-border/50 px-4 py-4">
              <HeroSidebar onNavigate={() => setMenuOpen(false)} initialCategories={initialCategories} />
            </div>
          </div>
        )}
      </nav>
      {isMobile && count > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-4 z-[55] flex items-center justify-center w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-xl transition-transform hover:scale-105 active:scale-95 touch-manipulation cursor-pointer"
          aria-label={`Carrito (${count} items)`}
          data-testid="cart-trigger"
        >
          <ShoppingBag className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        </button>
      )}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <WhatsAppAgentSelector
        open={whatsAppOpen}
        onClose={() => setWhatsAppOpen(false)}
        message="Hola, quiero hacer una consulta por WhatsApp."
      />
    </>
  )
}
