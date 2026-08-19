"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react"
import { useIsMobile } from "@/hooks/useIsMobile"

interface SidebarContextType {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
  isMobile: boolean
}

const SidebarContext = createContext<SidebarContextType | null>(null)

const STORAGE_KEY = "sidebar-collapsed"

export function SidebarProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile()
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored === "true"
    }
    return false
  })

  // Derived collapsed state: always true on mobile, uses state on desktop
  const effectiveCollapsed = isMobile ? true : collapsed

  // Persist to localStorage only on desktop changes
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem(STORAGE_KEY, String(collapsed))
    }
    // Also update body class for CSS-based detection fallback
    if (effectiveCollapsed) {
      document.body.classList.add("sidebar-collapsed")
    } else {
      document.body.classList.remove("sidebar-collapsed")
    }
  }, [collapsed, effectiveCollapsed, isMobile])

  const setCollapsed = useCallback((value: boolean) => {
    if (!isMobile) {
      setCollapsedState(value)
    }
  }, [isMobile])

  const toggleCollapsed = useCallback(() => {
    if (!isMobile) {
      setCollapsedState((prev) => !prev)
    }
  }, [isMobile])

  const value = useMemo(
    () => ({ collapsed: effectiveCollapsed, setCollapsed, toggleCollapsed, isMobile }),
    [effectiveCollapsed, setCollapsed, toggleCollapsed, isMobile]
  )

  return (
    <SidebarContext.Provider value={value}>
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
      isMobile: false,
    }
  }
  return ctx
}