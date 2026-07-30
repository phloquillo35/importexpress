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

export function HeroSidebar() {
  const [categories, setCategories] = useState<Category[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/categorias")
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const parents = categories.filter((c) => !c.parent)

  return (
    <aside className="w-full bg-card rounded-2xl border border-border/60 p-3 overflow-hidden">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
        Categorías
      </h3>
      <nav className="space-y-0.5">
        {parents.map((cat) => {
          const hasChildren = cat.children.length > 0
          const isExpanded = expanded === cat.id
          const totalProducts = cat._count.products + cat.children.reduce((s, c) => s + c._count.products, 0)

          return (
            <div key={cat.id}>
              <div
                className="group relative"
                onMouseEnter={() => hasChildren && setExpanded(cat.id)}
                onMouseLeave={() => setExpanded(null)}
              >
                <Link
                  href={`/categorias/${cat.slug}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Package className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="truncate flex-1">{cat.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{totalProducts}</span>
                  {hasChildren && (
                    <ChevronDown
                      className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </Link>

                {hasChildren && (
                  <div
                    className={`overflow-hidden transition-all duration-200 ${
                      isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="ml-5 pl-2 border-l border-border/40 space-y-0.5 py-0.5">
                      {cat.children.map((child) => (
                        <Link
                          key={child.id}
                          href={`/categorias/${cat.slug}?sub=${child.slug}`}
                          className="flex items-center gap-2 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        >
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                          <span className="truncate flex-1">{child.name}</span>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">{child._count.products}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
