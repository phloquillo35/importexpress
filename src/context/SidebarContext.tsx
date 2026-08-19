"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface SidebarContextType {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
}

const SidebarContext = createContext<SidebarContextType | null>(null)

const STORAGE_KEY = "sidebar-collapsed"

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored === "true"
    }
    return false
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed))
    // Also update body class for CSS-based detection fallback
    if (collapsed) {
      document.body.classList.add("sidebar-collapsed")
    } else {
      document.body.classList.remove("sidebar-collapsed")
    }
  }, [collapsed])

  const setCollapsed = (value: boolean) => {
    setCollapsedState(value)
  }

  const toggleCollapsed = () => {
    setCollapsedState((prev) => !prev)
  }

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) {
    // Fallback for components outside provider (e.g., SSR)
    return {
      collapsed: false,
      setCollapsed: () => {},
      toggleCollapsed: () => {},
    }
  }
  return ctx
}