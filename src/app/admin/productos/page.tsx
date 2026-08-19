"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Plus, Pencil, Trash2, Search, Package, Eye, EyeOff, X, Loader2, Star } from "lucide-react"
import { PapeleraModal } from "@/components/papelera-modal"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { calculateFinalPrice } from "@/lib/pricing"
import { useSidebar } from "@/context/SidebarContext"

interface Product {
  id: string
  slug: string
  name: string
  priceUSD: number
  costUSDT: number | null
  finalPriceUSD: number
  finalPriceARS: number
  yoniEnabled: boolean
  yoniType: string
  yoniValue: number
  shippingCost: number
  profitType: string
  profitValue: number
  stock: number
  minStock: number
  isAvailable: boolean
  createdAt: string
  category: { name: string; slug: string; parent: { name: string; slug: string } | null } | null
}

interface Category {
  id: string
  name: string
  slug: string
  children?: { id: string; name: string; slug: string }[]
}

export default function AdminProductosPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { collapsed: isSidebarCollapsed } = useSidebar()
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [totalAll, setTotalAll] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(() => {
    const raw = parseInt(searchParams.get("page") || "1", 10)
    return Number.isNaN(raw) ? 1 : Math.max(1, raw)
  })
  const [pageInput, setPageInput] = useState(() => {
    const raw = parseInt(searchParams.get("page") || "1", 10)
    return String(Number.isNaN(raw) ? 1 : Math.max(1, raw))
  })
  const [search, setSearch] = useState(searchParams.get("q") || "")
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") || "")
  const [categoriaId, setCategoriaId] = useState(searchParams.get("categoriaId") || "")
  const [disponible, setDisponible] = useState(searchParams.get("disponible") || "")
  const [destacados, setDestacados] = useState(searchParams.get("destacados") === "true")
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [exchangeRate, setExchangeRate] = useState(1)
  const [usdtRate, setUsdtRate] = useState(1)
  const highlightId = searchParams.get("highlight")
  const [viewProduct, setViewProduct] = useState<Product | null>(null)
  const limit = 20
  const [refreshKey, setRefreshKey] = useState(0)

  const categoryOptions = categories.flatMap((cat) => [
    { id: cat.id, name: cat.name },
    ...(cat.children || []).map((child) => ({ id: child.id, name: `${cat.name} / ${child.name}` })),
  ])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (debouncedSearch) params.set("q", debouncedSearch)
    else params.delete("q")
    if (page > 1) params.set("page", String(page))
    else params.delete("page")
    if (categoriaId) params.set("categoriaId", categoriaId)
    else params.delete("categoriaId")
    if (disponible) params.set("disponible", disponible)
    else params.delete("disponible")
    if (destacados) params.set("destacados", "true")
    else params.delete("destacados")
    const qs = params.toString()
    if (qs !== searchParams.toString()) {
      router.replace(`/admin/productos${qs ? `?${qs}` : ""}`, { scroll: false })
    }
  }, [debouncedSearch, page, categoriaId, disponible, destacados, searchParams, router])

  useEffect(() => {
    let cancelled = false
    async function fetchProducts() {
      setLoading(true)
      setIsSearching(true)
      try {
        const params = new URLSearchParams()
        if (debouncedSearch) params.set("search", debouncedSearch)
        params.set("admin", "1")
        params.set("page", String(page))
        params.set("limit", String(limit))
        if (categoriaId) params.set("categoriaId", categoriaId)
        if (disponible) params.set("disponible", disponible)
        if (destacados) params.set("destacados", "true")

        const res = await fetch(`/api/productos?${params}`)
        const data = await res.json()
        if (!cancelled) {
          setProducts(data.products || [])
          setTotal(data.total || 0)
          setTotalAll(data.totalAll || 0)
          setTotalPages(data.totalPages || 0)
        }
      } catch {
        if (!cancelled) toast.error("Error al cargar productos")
      } finally {
        if (!cancelled) {
          setLoading(false)
          setIsSearching(false)
        }
      }
    }
    fetchProducts()
    return () => { cancelled = true }
  }, [debouncedSearch, page, categoriaId, disponible, destacados, refreshKey])

  useEffect(() => {
    fetch("/api/categorias").then(r => r.json()).then(data => {
      setCategories(Array.isArray(data) ? data : [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetch("/api/configuracion").then(r => r.json()).then(data => {
      setExchangeRate(Number(data.exchange_rate) || 1)
      setUsdtRate(Number(data.usdt_rate) || 1)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (highlightId && products.length > 0) {
      const el = document.getElementById(`product-${highlightId}`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        el.classList.add("ring-2", "ring-[#F59E0B]", "bg-[#F59E0B]/5")
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-[#F59E0B]", "bg-[#F59E0B]/5")
        }, 3000)
      }
    }
  }, [highlightId, products])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setDebouncedSearch(search)
    setPage(1)
    setPageInput("1")
  }

  function handleGoToPage(e: React.FormEvent) {
    e.preventDefault()
    const target = parseInt(pageInput, 10)
    if (Number.isNaN(target) || totalPages < 1) {
      setPageInput(String(page))
      return
    }
    const clamped = Math.min(Math.max(target, 1), totalPages)
    setPageInput(String(clamped))
    setPage(clamped)
  }

  function handleClearSearch() {
    setSearch("")
    setDebouncedSearch("")
    setPage(1)
    setPageInput("1")
  }

  async function handleDelete(product: Product) {
    if (!confirm(`¿Eliminar "${product.name}"?`)) return
    try {
      const res = await fetch(`/api/productos/${product.slug}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Error al eliminar")
      toast.success("Producto eliminado")
      setRefreshKey(k => k + 1)
    } catch {
      toast.error("Error al eliminar el producto")
    }
  }

  async function handleToggleAvailability(product: Product) {
    try {
      const res = await fetch(`/api/productos/${product.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !product.isAvailable }),
      })
      if (!res.ok) throw new Error("Error al actualizar")
      toast.success(product.isAvailable ? "Producto ocultado" : "Producto visible")
      setRefreshKey(k => k + 1)
    } catch {
      toast.error("Error al cambiar disponibilidad")
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Productos</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} productos registrados</p>
        </div>
        <Button
          onClick={() => router.push("/admin/productos/nuevo")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo producto
        </Button>
      </div>

      <form onSubmit={handleSearch} className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); setPageInput("1") }}
              placeholder="Buscar por nombre, categoría, costo USDT, envío ARS, final USD, final ARS, stock, disponibilidad"
              className="pl-9 pr-9 bg-muted border-border text-foreground placeholder-muted-foreground"
            />
            {isSearching ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
            ) : search ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
          <Button type="submit" variant="secondary" className="bg-muted text-muted-foreground hover:bg-zinc-700">
            Buscar
          </Button>
          <PapeleraModal model="products" sectionLabel="Productos" onRestore={() => setRefreshKey(k => k + 1)} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={categoriaId || "__all"}
            onValueChange={(v) => { setCategoriaId(v === "__all" ? "" : v || ""); setPage(1); setPageInput("1") }}
          >
            <SelectTrigger className="w-52 bg-muted border-border text-foreground">
              <SelectValue placeholder="Todas las categorías">
                {categoriaId ? categoryOptions.find((c) => c.id === categoriaId)?.name || "Todas las categorías" : "Todas las categorías"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas las categorías</SelectItem>
              {categoryOptions.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={disponible || "__all"}
            onValueChange={(v) => { setDisponible(v === "__all" ? "" : v || ""); setPage(1); setPageInput("1") }}
          >
            <SelectTrigger className="w-44 bg-muted border-border text-foreground">
              <SelectValue placeholder="Disponibilidad">
                {disponible === "true" ? "Disponible" : disponible === "false" ? "No disponible" : "Disponibilidad"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos</SelectItem>
              <SelectItem value="true">Disponible</SelectItem>
              <SelectItem value="false">No disponible</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant={destacados ? "default" : "outline"}
            onClick={() => { setDestacados(d => !d); setPage(1); setPageInput("1") }}
            className={destacados ? "bg-primary text-primary-foreground" : "border-border text-muted-foreground"}
          >
            <Star className="w-4 h-4 mr-2" />
            Destacados
          </Button>
        </div>

        <p aria-live="polite" className="text-sm text-muted-foreground">
          {debouncedSearch
            ? `${total} resultados para "${debouncedSearch}" de ${totalAll} total`
            : `${total} de ${totalAll} productos`}
        </p>
      </form>

      <div className="bg-card border border-border rounded-xl overflow-x-auto shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground max-w-[320px] min-w-[180px] sm:max-w-[240px] sm:min-w-[140px] truncate">Producto</TableHead>
              <TableHead className="text-muted-foreground max-w-[200px] min-w-[120px] sm:max-w-[160px] sm:min-w-[100px] truncate">Categoría</TableHead>
              <TableHead className="text-muted-foreground whitespace-nowrap">Fecha creación</TableHead>
              <TableHead className="text-muted-foreground text-right w-[50px] sm:w-[70px] md:w-[80px]">Costo USDT</TableHead>
              <TableHead className="text-muted-foreground text-right w-[50px] sm:w-[70px] md:w-[80px]">Logística</TableHead>
              <TableHead className="text-muted-foreground text-right w-[50px] sm:w-[70px] md:w-[80px]">Envío ARS</TableHead>
              <TableHead className="text-muted-foreground text-right w-[50px] sm:w-[70px] md:w-[80px]">Subtotal ARS</TableHead>
              <TableHead className="text-muted-foreground text-right w-[40px] sm:w-[60px] md:w-[60px]">Ganancia ARS</TableHead>
              <TableHead className="text-muted-foreground text-right w-[50px] sm:w-[70px] md:w-[70px]">Final ARS</TableHead>
              <TableHead className="text-muted-foreground text-right w-[50px] sm:w-[70px] md:w-[70px]">Final USD</TableHead>
              <TableHead className="text-muted-foreground text-center w-[30px] sm:w-[45px]">Stock</TableHead>
              <TableHead className="text-muted-foreground text-center w-[30px] sm:w-[45px]">Disp.</TableHead>
              <TableHead className="text-muted-foreground text-right w-[80px] sm:w-[100px] md:w-[120px] lg:w-[130px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center text-muted-foreground py-12">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center text-muted-foreground py-12">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No hay productos</p>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const pricing = calculateFinalPrice({
                  costUSDT: product.costUSDT || 0,
                  yoniEnabled: product.yoniEnabled,
                  yoniType: (product.yoniType as "percentage" | "fixed_usdt" | "fixed_ars") || "percentage",
                  yoniValue: product.yoniValue || 0,
                  shippingCost: product.shippingCost || 0,
                  profitType: (product.profitType as "percentage" | "fixed_usdt" | "fixed_ars") || "percentage",
                  profitValue: product.profitValue || 0,
                  exchangeRate,
                  usdtRate,
                })
return (
                <TableRow
                  id={`product-${product.id}`}
                  key={product.id}
                  className="border-border hover:bg-muted/50 transition-colors even:bg-muted/30 focus-visible:ring-2 focus-visible:ring-primary/20"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setViewProduct(product); } }}
                >
                  <TableCell className="font-medium text-foreground cursor-pointer max-w-[320px] min-w-[180px] sm:max-w-[240px] sm:min-w-[140px] truncate" onClick={() => setViewProduct(product)} title={product.name}>
                    {product.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground cursor-pointer max-w-[200px] min-w-[120px] sm:max-w-[160px] sm:min-w-[100px] truncate" onClick={() => setViewProduct(product)} title={product.category?.parent ? `${product.category.parent.name} / ${product.category.name}` : (product.category?.name || "")}>
                    {product.category?.parent?.name || product.category?.name || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground cursor-pointer whitespace-nowrap" onClick={() => setViewProduct(product)}>
                    {product.createdAt ? new Date(product.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-foreground cursor-pointer w-[50px] sm:w-[70px] md:w-[80px]" onClick={() => setViewProduct(product)}>${(product.costUSDT || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right text-muted-foreground cursor-pointer w-[50px] sm:w-[70px] md:w-[80px]" onClick={() => setViewProduct(product)}>
                    {product.yoniEnabled ? `$${pricing.yoniUSDT.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground cursor-pointer w-[50px] sm:w-[70px] md:w-[80px]" onClick={() => setViewProduct(product)}>
                    ${(product.shippingCost || 0).toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell className="text-right text-foreground cursor-pointer w-[50px] sm:w-[70px] md:w-[80px]" onClick={() => setViewProduct(product)}>
                    ${pricing.subtotalARS.toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell className="text-right text-[#0071e3] cursor-pointer w-[40px] sm:w-[60px] md:w-[60px]" onClick={() => setViewProduct(product)}>
                    ${pricing.profitARS.toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell className="text-right text-[#22C55E] font-medium cursor-pointer w-[50px] sm:w-[70px] md:w-[70px]" onClick={() => setViewProduct(product)}>
                    ${pricing.finalPriceARS.toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground cursor-pointer w-[50px] sm:w-[70px] md:w-[70px]" onClick={() => setViewProduct(product)}>
                    ${pricing.finalPriceUSD.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center cursor-pointer w-[30px] sm:w-[45px]" onClick={() => setViewProduct(product)}>
                    <span className={product.stock <= product.minStock ? "text-red-400 font-medium" : "text-muted-foreground"}>
                      {product.stock}
                    </span>
                  </TableCell>
                  <TableCell className="text-center cursor-pointer w-[30px] sm:w-[45px]" onClick={() => setViewProduct(product)}>
                    {product.isAvailable ? (
                      <Badge className="bg-[#22C55E]/10 text-[#22C55E] border-0">Sí</Badge>
                    ) : (
                      <Badge className="bg-red-500/10 text-red-400 border-0">No</Badge>
                    )}
                  </TableCell>
                  <TableCell className={`text-right ${isSidebarCollapsed ? "w-[70px] sm:w-[80px] md:w-[90px] lg:w-[100px]" : "w-[80px] sm:w-[100px] md:w-[120px] lg:w-[130px]"} transition-all duration-200`}>
                    <div className={`flex items-center justify-end gap-${isSidebarCollapsed ? "0.5" : "1.5"} ${isSidebarCollapsed ? "flex-col" : "flex-row"} w-full`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); router.push(`/admin/productos/${product.slug}/editar`) }}
                        className="hover:bg-accent/10 text-muted-foreground hover:text-[#22C55E]"
                        title="Editar producto"
                      >
                        <Pencil className={`w-3.5 h-3.5 transition-all duration-200 ${isSidebarCollapsed ? "w-3 h-5 scale-x-125" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handleToggleAvailability(product) }}
                        className={product.isAvailable ? "hover:bg-accent/10 text-muted-foreground hover:text-red-400" : "hover:bg-accent/10 text-muted-foreground hover:text-[#22C55E]"}
                        title={product.isAvailable ? "Ocultar de la web" : "Mostrar en la web"}
                      >
                        {product.isAvailable ? (
                          <EyeOff className={`w-3.5 h-3.5 transition-all duration-200 ${isSidebarCollapsed ? "w-3 h-5 scale-x-125" : ""}`} />
                        ) : (
                          <Eye className={`w-3.5 h-3.5 transition-all duration-200 ${isSidebarCollapsed ? "w-3 h-5 scale-x-125" : ""}`} />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handleDelete(product) }}
                        className="hover:bg-accent/10 text-muted-foreground hover:text-red-400"
                        title="Eliminar producto"
                      >
                        <Trash2 className={`w-3.5 h-3.5 transition-all duration-200 ${isSidebarCollapsed ? "w-3 h-5 scale-x-125" : ""}`} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => { setPage(page - 1); setPageInput(String(page - 1)) }}
            className="border-border text-muted-foreground"
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled
            className="bg-primary text-primary-foreground"
          >
            {page}
          </Button>
          {page < totalPages && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPage(page + 1); setPageInput(String(page + 1)) }}
              className="border-border text-muted-foreground"
            >
              {page + 1}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => { setPage(page + 1); setPageInput(String(page + 1)) }}
            className="border-border text-muted-foreground"
          >
            Siguiente
          </Button>
          <span className="text-sm text-muted-foreground">de {totalPages}</span>
          <div className="w-px h-6 bg-border" />
          <form onSubmit={handleGoToPage} className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">Ir a</span>
            <Input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="w-16 h-8 text-center bg-muted border-border text-foreground"
            />
            <Button type="submit" size="sm" variant="outline" className="border-border text-muted-foreground">
              Buscar
            </Button>
          </form>
        </div>
      )}

      <Dialog open={!!viewProduct} onOpenChange={(o) => { if (!o) setViewProduct(null) }}>
        <DialogContent className="bg-card text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewProduct?.name}</DialogTitle>
          </DialogHeader>
          {viewProduct && (() => {
            const p = viewProduct
            const pricing = calculateFinalPrice({
              costUSDT: p.costUSDT || 0,
              yoniEnabled: p.yoniEnabled,
              yoniType: (p.yoniType as "percentage" | "fixed_usdt" | "fixed_ars") || "percentage",
              yoniValue: p.yoniValue || 0,
              shippingCost: p.shippingCost || 0,
              profitType: (p.profitType as "percentage" | "fixed_usdt" | "fixed_ars") || "percentage",
              profitValue: p.profitValue || 0,
              exchangeRate,
              usdtRate,
            })
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground text-xs">Slug</p><p className="text-foreground">{p.slug}</p></div>
                  <div><p className="text-muted-foreground text-xs">Categoría</p><p className="text-foreground">{p.category?.name || "—"}</p></div>
                  <div><p className="text-muted-foreground text-xs">Costo USDT</p><p className="text-foreground">${(p.costUSDT || 0).toFixed(2)}</p></div>
                  <div><p className="text-muted-foreground text-xs">Logística</p><p className="text-foreground">{p.yoniEnabled ? `$${pricing.yoniUSDT.toFixed(2)}` : "—"}</p></div>
                  <div><p className="text-muted-foreground text-xs">Envío ARS</p><p className="text-foreground">${(p.shippingCost || 0).toLocaleString("es-AR")}</p></div>
                  <div><p className="text-muted-foreground text-xs">Subtotal ARS</p><p className="text-foreground">${pricing.subtotalARS.toLocaleString("es-AR")}</p></div>
                  <div><p className="text-muted-foreground text-xs">Ganancia ARS</p><p className="text-[#0071e3]">${pricing.profitARS.toLocaleString("es-AR")}</p></div>
                  <div><p className="text-muted-foreground text-xs">Final ARS</p><p className="text-[#22C55E] font-medium">${pricing.finalPriceARS.toLocaleString("es-AR")}</p></div>
                  <div><p className="text-muted-foreground text-xs">Final USD</p><p className="text-foreground">${pricing.finalPriceUSD.toFixed(2)}</p></div>
                  <div><p className="text-muted-foreground text-xs">Stock</p><p className={p.stock <= p.minStock ? "text-red-400 font-medium" : "text-foreground"}>{p.stock} / mín. {p.minStock}</p></div>
                  <div><p className="text-muted-foreground text-xs">Disponible</p><p className={p.isAvailable ? "text-[#22C55E]" : "text-red-400"}>{p.isAvailable ? "Sí" : "No"}</p></div>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}