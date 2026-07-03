"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Search, Package, Eye, EyeOff } from "lucide-react"
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
import { formatUSD } from "@/lib/utils"

interface Product {
  id: string
  slug: string
  name: string
  priceUSD: number
  costUSDT: number | null
  finalPriceARS: number
  stock: number
  minStock: number
  isAvailable: boolean
  category: { name: string; slug: string } | null
}

export default function AdminProductosPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const limit = 20

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      params.set("admin", "1")
      params.set("page", String(page))
      params.set("limit", String(limit))

      const res = await fetch(`/api/productos?${params}`)
      const data = await res.json()
      setProducts(data.products || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 0)
    } catch {
      toast.error("Error al cargar productos")
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchProducts()
  }

  async function handleDelete(product: Product) {
    if (!confirm(`¿Eliminar "${product.name}"?`)) return
    try {
      const res = await fetch(`/api/productos/${product.slug}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Error al eliminar")
      toast.success("Producto eliminado")
      fetchProducts()
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
      fetchProducts()
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

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar productos..."
            className="pl-9 bg-muted border-border text-foreground placeholder-muted-foreground"
          />
        </div>
        <Button type="submit" variant="secondary" className="bg-muted text-muted-foreground hover:bg-zinc-700">
          Buscar
        </Button>
      </form>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Producto</TableHead>
              <TableHead className="text-muted-foreground hidden md:table-cell">Categoría</TableHead>
              <TableHead className="text-muted-foreground text-right">Costo USDT</TableHead>
              <TableHead className="text-muted-foreground text-right">Precio final ARS</TableHead>
              <TableHead className="text-muted-foreground text-center">Stock</TableHead>
              <TableHead className="text-muted-foreground text-center hidden sm:table-cell">Disp.</TableHead>
              <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No hay productos</p>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id} className="border-border hover:bg-muted">
                  <TableCell className="font-medium text-foreground">{product.name}</TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">
                    {product.category?.name || "—"}
                  </TableCell>
                  <TableCell className="text-right text-foreground">${(product.costUSDT || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right text-[#F59E0B] font-medium">${(product.finalPriceARS || 0).toLocaleString("es-AR")}</TableCell>
                  <TableCell className="text-center">
                    <span className={product.stock <= product.minStock ? "text-red-400 font-medium" : "text-muted-foreground"}>
                      {product.stock}
                    </span>
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    {product.isAvailable ? (
                      <Badge className="bg-[#22C55E]/10 text-[#22C55E] border-0">Sí</Badge>
                    ) : (
                      <Badge className="bg-red-500/10 text-red-400 border-0">No</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/admin/productos/${product.slug}/editar`)}
                        className="text-muted-foreground hover:text-[#22C55E]"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleAvailability(product)}
                        className={product.isAvailable ? "text-muted-foreground hover:text-red-400" : "text-muted-foreground hover:text-[#22C55E]"}
                        title={product.isAvailable ? "Ocultar de la web" : "Mostrar en la web"}
                      >
                        {product.isAvailable ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product)}
                        className="text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
            onClick={() => setPage(page - 1)}
            className="border-border text-muted-foreground"
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="border-border text-muted-foreground"
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  )
}
