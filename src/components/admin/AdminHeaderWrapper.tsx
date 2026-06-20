"use client"

import { useState } from "react"
import { AdminHeader } from "./AdminHeader"
import { Sidebar } from "./Sidebar"
import { cn } from "@/lib/utils"

export function AdminHeaderWrapper() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <AdminHeader onMenuClick={() => setSidebarOpen(true)} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>
    </>
  )
}
