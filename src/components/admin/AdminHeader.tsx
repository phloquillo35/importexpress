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
    <header className="h-16 bg-white border-b border-[#d2d2d7]/60 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className={cn(
          "hidden md:flex items-center gap-2 bg-[#f5f5f7] border border-[#d2d2d7]/60 rounded-lg px-3 py-1.5",
          searchOpen && "flex"
        )}>
          <Search className="w-4 h-4 text-[#6e6e73]" />
          <input
            type="text"
            placeholder="Buscar..."
            className="bg-transparent text-sm text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none w-48"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="md:hidden p-2 rounded-lg text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>

        <button className="relative p-2 rounded-lg text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0071e3] rounded-full" />
        </button>

        <div className="flex items-center gap-3 ml-2 pl-3 border-l border-[#d2d2d7]/60">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-[#1d1d1f]">{session?.user?.name || "Admin"}</p>
            <p className="text-xs text-[#6e6e73]">{session?.user?.email}</p>
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
