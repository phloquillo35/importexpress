"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Package,
  Tags,
  Warehouse,
  DollarSign,
  ShoppingCart,
  Truck,
  Ship,
  Settings,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/categorias", label: "Categorías", icon: Tags },
  { href: "/admin/stock", label: "Stock", icon: Warehouse },
  { href: "/admin/finanzas", label: "Finanzas", icon: DollarSign },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart },
  { href: "/admin/distribuidores", label: "Distribuidores", icon: Truck },
  { href: "/admin/bultos", label: "Bultos", icon: Ship },
  { href: "/admin/reportes", label: "Reportes", icon: FileText },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "bg-white border-r border-[#d2d2d7]/60 flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[#d2d2d7]/60">
        <div className="w-8 h-8 rounded-lg bg-[#F59E0B] flex items-center justify-center flex-shrink-0">
          <Package className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-heading font-semibold text-[#1d1d1f] text-sm">Lo Pedís, Lo Tenes</span>
        )}
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/")

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-[#0071e3]/10 text-[#0071e3]"
                  : "text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]"
              )}
              title={collapsed ? link.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-[#d2d2d7]/60 p-2 space-y-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span>Colapsar</span>}
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#6e6e73] hover:text-red-400 hover:bg-red-500/5 transition-colors"
          title={collapsed ? "Cerrar sesión" : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  )
}
