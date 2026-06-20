"use client"

import { useEffect, useState, useRef } from "react"
import { Search, Upload, FileSpreadsheet, Package, Plus, Minus } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatUSD } from "@/lib/utils"
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
  const [saving, setSaving] = useState(false)
  const [importResult, setImportResult] = useState<{
    created: number
    updated: number
    errors: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

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
      const q = search.toLowerCase()
      setFiltered(products.filter((p) => p.name.toLowerCase().includes(q)))
    }
  }, [search, products])

  function openAdjust(product: StockProduct) {
    setAdjustProduct(product)
    setAdjustQty(String(product.stock))
    setAdjustOp("set")
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
          quantity: parseInt(adjustQty) * (adjustOp === "add" ? 1 : 1),
          operation: adjustOp,
        }),
      })
      if (!res.ok) throw new Error("Error al ajustar")
      toast.success("Stock ajustado")
      setAdjustProduct(null)
      loadStock()
    } catch {
      toast.error("Error al ajustar stock")
    } finally {
      setSaving(false)
    }
  }

  async function handleImportFile(file: File) {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Solo se aceptan archivos .xlsx o .xls")
      return
    }

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/stock/import", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setImportResult(data.summary)
      toast.success(`Importación completada: ${data.summary.created} creados, ${data.summary.updated} actualizados`)
      loadStock()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al importar")
    }
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleImportFile(file)
  }

  function getStockColor(product: StockProduct) {
    if (product.stock <= product.minStock) return "text-red-400"
    if (product.stock <= product.minStock * 2) return "text-yellow-400"
    return "text-[#22C55E]"
  }

  function getStockBg(product: StockProduct) {
    if (product.stock <= product.minStock) return "bg-red-500/10"
    if (product.stock <= product.minStock * 2) return "bg-yellow-500/10"
    return "bg-[#22C55E]/10"
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-heading">Stock</h1>
        <p className="text-zinc-400 text-sm mt-1">Gestioná el inventario de productos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500"
            />
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Producto</TableHead>
                  <TableHead className="text-zinc-400 hidden sm:table-cell">Categoría</TableHead>
                  <TableHead className="text-zinc-400 text-right">Precio</TableHead>
                  <TableHead className="text-zinc-400 text-center">Stock</TableHead>
                  <TableHead className="text-zinc-400 text-center">Mínimo</TableHead>
                  <TableHead className="text-zinc-400 text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-zinc-500 py-12">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-zinc-500 py-12">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>{search ? "Sin resultados" : "No hay productos"}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((product) => (
                    <TableRow key={product.id} className="border-zinc-800/50 hover:bg-white/5">
                      <TableCell className="font-medium text-white">{product.name}</TableCell>
                      <TableCell className="text-zinc-400 text-sm hidden sm:table-cell">
                        {product.category?.name || "—"}
                      </TableCell>
                      <TableCell className="text-right text-zinc-200">{formatUSD(product.priceUSD)}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium",
                          getStockBg(product),
                          getStockColor(product)
                        )}>
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-zinc-500">{product.minStock}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAdjust(product)}
                          className="text-zinc-400 hover:text-[#22C55E] text-xs"
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

        <div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
              dragging
                ? "border-[#22C55E] bg-[#22C55E]/5"
                : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImportFile(file)
                e.target.value = ""
              }}
            />
            <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
            <p className="text-sm text-zinc-300 font-medium mb-1">Importar Excel</p>
            <p className="text-xs text-zinc-500 mb-3">Arrastrá o hacé clic para subir</p>
            <div className="inline-flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-800 px-3 py-1.5 rounded-full">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              .xlsx / .xls
            </div>
          </div>

          {importResult && (
            <div className="mt-4 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-medium text-white">Resultado</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#22C55E]">{importResult.created} creados</span>
                <span className="text-zinc-600">·</span>
                <span className="text-[#F59E0B]">{importResult.updated} actualizados</span>
                {importResult.errors > 0 && (
                  <>
                    <span className="text-zinc-600">·</span>
                    <span className="text-red-400">{importResult.errors} errores</span>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImportResult(null)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!adjustProduct} onOpenChange={(o) => { if (!o) setAdjustProduct(null) }}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Ajustar stock: {adjustProduct?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdjust} className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Stock actual:</span>
              <span className="text-lg font-bold text-white">{adjustProduct?.stock}</span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAdjustOp("set")}
                className={cn(
                  "border-zinc-700",
                  adjustOp === "set" ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]" : "text-zinc-400"
                )}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Establecer
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAdjustOp("add")}
                className={cn(
                  "border-zinc-700",
                  adjustOp === "add" ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]" : "text-zinc-400"
                )}
              >
                <Minus className="w-3.5 h-3.5 mr-1" />
                Ajustar
              </Button>
            </div>

            <div className="space-y-2">
              <Label>
                {adjustOp === "set" ? "Nuevo stock" : "Cantidad a agregar"}
              </Label>
              <Input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAdjustProduct(null)}
                className="text-zinc-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#22C55E] hover:bg-[#16A34A] text-white"
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
