"use client"

import { useSession } from "next-auth/react"
import { Bell, Menu, Sun, Moon } from "lucide-react"
import { useState } from "react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface AdminHeaderProps {
  onMenuClick: () => void
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [lowStockOpen, setLowStockOpen] = useState(false)
  const [lowStockItems, setLowStockItems] = useState<{ id: string; name: string; stock: number; minStock: number }[]>([])

  async function openLowStock() {
    setLowStockOpen(true)
    if (lowStockItems.length === 0) {
      try {
        const res = await fetch("/api/productos?admin=1&limit=200")
        const data = await res.json()
        const products = data.products || []
        const low = products.filter((p: any) => p.stock <= p.minStock)
        setLowStockItems(low.map((p: any) => ({ id: p.id, name: p.name, stock: p.stock, minStock: p.minStock })))
      } catch {}
    }
  }

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-3">

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <Popover open={lowStockOpen} onOpenChange={setLowStockOpen}>
          <PopoverTrigger onClick={openLowStock}>
            <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Bell className="w-5 h-5" />
              {lowStockItems.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                  {lowStockItems.length > 9 ? "9+" : lowStockItems.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="p-1">
              <p className="text-sm font-medium text-foreground mb-2">Stock Bajo</p>
              {lowStockItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay productos con stock bajo</p>
              ) : (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {lowStockItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setLowStockOpen(false); router.push("/admin/stock") }}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted text-sm"
                    >
                      <span className="text-foreground truncate">{item.name}</span>
                      <span className="text-red-400 font-medium ml-2 flex-shrink-0">{item.stock} / {item.minStock}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-3 ml-2 pl-3 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground">{session?.user?.name || "Admin"}</p>
            <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#F59E0B]/20 border-2 border-[#F59E0B]/30 flex items-center justify-center">
            <span className="text-sm font-bold text-[#F59E0B]">
              {(session?.user?.name || "A").charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
