"use client"

import { useSession } from "next-auth/react"
import { Menu } from "lucide-react"

interface HeaderProps {
  onMenuClick: () => void
}

export function AdminHeader({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession()

  return (
    <header className="h-16 border-b border-zinc-800 bg-[#0F172A] flex items-center justify-between px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#F59E0B]/20 flex items-center justify-center">
          <span className="text-xs font-medium text-[#F59E0B]">
            {session?.user?.name?.charAt(0)?.toUpperCase() || "A"}
          </span>
        </div>
        <span className="text-sm text-zinc-300 hidden sm:block">
          {session?.user?.name || "Admin"}
        </span>
      </div>
    </header>
  )
}
