"use client"

import { useSession } from "next-auth/react"
import { Bell, Search, Menu } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface AdminHeaderProps {
  onMenuClick: () => void
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { data: session } = useSession()
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="h-16 bg-[#0F172A] border-b border-zinc-800 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className={cn(
          "hidden md:flex items-center gap-2 bg-white/5 border border-zinc-700 rounded-lg px-3 py-1.5",
          searchOpen && "flex"
        )}>
          <Search className="w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar..."
            className="bg-transparent text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none w-48"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>

        <button className="relative p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#22C55E] rounded-full" />
        </button>

        <div className="flex items-center gap-3 ml-2 pl-3 border-l border-zinc-800">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-zinc-200">{session?.user?.name || "Admin"}</p>
            <p className="text-xs text-zinc-500">{session?.user?.email}</p>
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
