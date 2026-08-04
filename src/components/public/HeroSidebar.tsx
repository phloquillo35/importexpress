"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Package, ChevronDown } from "lucide-react"

interface SubCategory {
  id: string
  name: string
  slug: string
  _count: { products: number }
}

interface Category {
  id: string
  name: string
  slug: string
  parent: { id: string; name: string; slug: string } | null
  _count: { products: number }
  children: SubCategory[]
}

interface HeroSidebarProps {
  onNavigate?: () => void
  onSelectCategory?: (slug: string) => void
  onReset?: () => void
  initialCategories?: Category[]
  activeCategory?: string
  showVerTodas?: boolean
}

function isTouchDevice() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
}

export function HeroSidebar({ onNavigate, onSelectCategory, onReset, initialCategories, activeCategory, showVerTodas }: HeroSidebarProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories ?? [])
  const [expanded, setExpanded] = useState<string | null>(null)

  const hasInitialCategories = initialCategories !== undefined

  useEffect(() => {
    if (!hasInitialCategories) {
      fetch("/api/categorias")
        .then((r) => r.json())
        .then((data) => setCategories(Array.isArray(data) ? data : []))
        .catch(() => {})
    }
  }, [hasInitialCategories])

  const parents = categories.filter((c) => !c.parent)

  function handleParentClick(e: React.MouseEvent, cat: Category) {
    if (isTouchDevice() && cat.children.length > 0) {
      e.preventDefault()
      setExpanded((prev) => (prev === cat.id ? null : cat.id))
      return
    }
    onNavigate?.()
    if (onSelectCategory) {
      e.preventDefault()
      onSelectCategory(cat.slug)
    }
  }

  return (
    <aside className="w-full bg-card rounded-2xl border border-border/60 p-3 overflow-hidden">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
        Categorías
      </h3>
      {onReset && (
        <button
          onClick={onReset}
          aria-current={!activeCategory ? "true" : undefined}
          className={`w-full text-left px-2 py-1.5 rounded-lg text-sm font-medium transition-colors mb-2 ${
            !activeCategory ? "bg-primary/10 text-primary" : "text-primary hover:text-[#0077ed] hover:bg-muted/50"
          }`}
        >
          Todas las categorías
        </button>
      )}
      <nav className="space-y-0.5">
        {parents.map((cat) => {
          const hasChildren = cat.children.length > 0
          const isExpanded = expanded === cat.id
          const isParentActive = activeCategory === cat.slug

          const parentClasses = `flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
            isParentActive ? "bg-primary/10 text-primary font-medium" : "text-foreground/80 hover:text-foreground hover:bg-muted"
          }`

          return (
            <div key={cat.id}>
              <div
                className="group relative"
                onMouseEnter={
                  hasChildren
                    ? () => {
                        if (!isTouchDevice()) setExpanded(cat.id)
                      }
                    : undefined
                }
                onMouseLeave={() => {
                  if (!isTouchDevice()) setExpanded(null)
                }}
              >
                {onSelectCategory ? (
                  <button
                    onClick={(e) => handleParentClick(e, cat)}
                    aria-current={isParentActive ? "true" : undefined}
                    className={`${parentClasses} w-full`}
                  >
                    <Package className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="truncate flex-1">{cat.name}</span>
                    {hasChildren && (
                      <ChevronDown
                        className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </button>
                ) : (
                  <Link
                    href={`/categorias/${cat.slug}`}
                    onClick={(e) => handleParentClick(e, cat)}
                    aria-current={isParentActive ? "true" : undefined}
                    className={parentClasses}
                  >
                    <Package className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="truncate flex-1">{cat.name}</span>
                    {hasChildren && (
                      <ChevronDown
                        className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </Link>
                )}

                {hasChildren && (
                  <div
                    className={`overflow-hidden transition-all duration-200 ${
                      isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="ml-5 pl-2 border-l border-border/40 space-y-0.5 py-0.5">
                      {onSelectCategory ? (
                        <button
                          onClick={() => onSelectCategory(cat.slug)}
                          className="flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium text-primary hover:text-[#0077ed] hover:bg-muted/50 transition-colors w-full text-left"
                        >
                          Ver todos los {cat.name}
                        </button>
                      ) : (
                        <Link
                          href={`/categorias/${cat.slug}`}
                          onClick={() => onNavigate?.()}
                          className="flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium text-primary hover:text-[#0077ed] hover:bg-muted/50 transition-colors"
                        >
                          Ver todos los {cat.name}
                        </Link>
                      )}
                      {cat.children.map((child) => {
                        const isChildActive = activeCategory === child.slug
                        const childClasses = `flex items-center gap-2 px-2 py-1 rounded-md text-xs transition-colors ${
                          isChildActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`
                        return onSelectCategory ? (
                          <button
                            key={child.id}
                            onClick={() => onSelectCategory(child.slug)}
                            aria-current={isChildActive ? "true" : undefined}
                            className={`${childClasses} w-full text-left`}
                          >
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                            <span className="truncate flex-1">{child.name}</span>
                          </button>
                        ) : (
                          <Link
                            key={child.id}
                            href={`/categorias/${cat.slug}?sub=${child.slug}`}
                            onClick={() => onNavigate?.()}
                            aria-current={isChildActive ? "true" : undefined}
                            className={childClasses}
                          >
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                            <span className="truncate flex-1">{child.name}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </nav>
      {showVerTodas && (
        <button
          onClick={() => {
            document.getElementById("categorias")?.scrollIntoView({ behavior: "smooth" })
            onNavigate?.()
          }}
          className="w-full mt-3 px-2 py-1.5 rounded-lg text-sm font-medium text-primary hover:text-[#0077ed] hover:bg-muted/50 transition-colors"
        >
          Ver todas
        </button>
      )}
    </aside>
  )
}
