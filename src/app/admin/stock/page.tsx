"use client"

import { useEffect, useState } from "react"
import { Search, Package, Plus, Minus } from "lucide-react"
import { toast } from "sonner"
import { cn, formatUSD } from "@/lib/utils"
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
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface StockProduct {
  id: string
  name: string
  slug: string
  stock: number
  minStock: number
  priceUSD: number
  isAvailable: boolean
  category: { name: string } | null
}

export default function AdminStockPage() {
  const [products, setProducts] = useState<StockProduct[]>([])
  const [filtered, setFiltered] = useState<StockProduct[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [adjustProduct, setAdjustProduct] = useState<StockProduct | null>(null)
  const [adjustQty, setAdjustQty] = useState("")
  const [adjustOp, setAdjustOp] = useState<"add" | "set">("set")
  const [adjustField, setAdjustField] = useState<"stock" | "minStock">("stock")
  const [saving, setSaving] = useState(false)

  async function loadStock() {
    try {
      const res = await fetch("/api/stock")
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Error al cargar stock")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStock()
  }, [])

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(products)
    } else {
      const q = search.toLowerCase().trim()
      const num = parseFloat(q.replace(/[$,.]/g, ""))
      const isNumeric = !isNaN(num)
      setFiltered(products.filter((p) => {
        if (p.name.toLowerCase().includes(q)) return true
        if (p.category?.name?.toLowerCase().includes(q)) return true
        if (isNumeric) {
          if (p.stock === num) return true
          if (p.minStock === num) return true
          if (p.priceUSD === num) return true
        }
        if ((q === "disponible" || q === "si" || q === "sí") && p.isAvailable) return true
        if ((q === "no" || q === "oculto") && !p.isAvailable) return true
        return false
      }))
    }
  }, [search, products])

  function openAdjust(product: StockProduct) {
    setAdjustProduct(product)
    setAdjustQty(String(product.stock))
    setAdjustOp("set")
    setAdjustField("stock")
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault()
    if (!adjustProduct) return

    setSaving(true)
    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: adjustProduct.id,
          quantity: parseInt(adjustQty),
          operation: adjustOp,
          field: adjustField,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al ajustar stock")
      }
      toast.success("Stock ajustado")
      setAdjustProduct(null)
      loadStock()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al ajustar stock")
    } finally {
      setSaving(false)
    }
  }

  function getStockColor(product: StockProduct) {
    if (product.stock <= product.minStock) return "text-red-400"
    if (product.stock <= product.minStock * 2) return "text-yellow-400"
    return "text-[#22C55E]"
  }

  function getStockBg(product: StockProduct) {
    if (product.stock <= product.minStock) return "bg-red-500/10"
    if (product.stock <= product.minStock * 2) return "bg-yellow-500/10"
    return "bg-primary/10"
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-heading">Stock</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestioná el inventario de productos</p>
      </div>

      <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, categoría, stock, mínimo, precio, disponibilidad"
              className="pl-9 bg-muted border-border text-foreground placeholder-muted-foreground"
            />
          </div>

          <div className="bg-card border border-border rounded-xl overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Producto</TableHead>
                  <TableHead className="text-muted-foreground hidden sm:table-cell">Categoría</TableHead>
                  <TableHead className="text-muted-foreground text-right">Precio</TableHead>
                  <TableHead className="text-muted-foreground text-center">Stock</TableHead>
                  <TableHead className="text-muted-foreground text-center">Mínimo</TableHead>
                  <TableHead className="text-muted-foreground text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>{search ? "Sin resultados" : "No hay productos"}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((product) => (
                    <TableRow key={product.id} className="border-border hover:bg-muted">
                      <TableCell className="font-medium text-foreground">{product.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">
                        {product.category?.name || "—"}
                      </TableCell>
                      <TableCell className="text-right text-foreground">{formatUSD(product.priceUSD)}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium",
                          getStockBg(product),
                          getStockColor(product)
                        )}>
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">{product.minStock}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAdjust(product)}
                          className="text-muted-foreground hover:text-[#22C55E] text-xs"
                        >
                          Ajustar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
        </div>
      </div>

      <Dialog open={!!adjustProduct} onOpenChange={(o) => { if (!o) setAdjustProduct(null) }}>
        <DialogContent className="bg-popover border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Ajustar stock: {adjustProduct?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdjust} className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Stock actual:</span>
              <span className="text-lg font-bold text-foreground">{adjustProduct?.stock}</span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setAdjustField("stock"); setAdjustOp("set"); setAdjustQty(String(adjustProduct?.stock ?? 0)) }}
                className={cn(
                  "border-border",
                  adjustField === "stock" && adjustOp === "set" ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]" : "text-muted-foreground"
                )}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Stock
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setAdjustField("minStock"); setAdjustOp("set"); setAdjustQty(String(adjustProduct?.minStock ?? 0)) }}
                className={cn(
                  "border-border",
                  adjustField === "minStock" && adjustOp === "set" ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]" : "text-muted-foreground"
                )}
              >
                <Minus className="w-3.5 h-3.5 mr-1" />
                Mínimo
              </Button>
            </div>

            <div className="space-y-2">
              <Label>
                {adjustField === "stock" ? "Valor total de stock" : "Valor mínimo de stock"}
              </Label>
              <Input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                className="bg-muted border-border text-foreground"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAdjustProduct(null)}
                className="text-muted-foreground"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
