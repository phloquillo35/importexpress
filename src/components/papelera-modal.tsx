"use client"

import { useState, useEffect, useCallback } from "react"
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface PapeleraItem {
  id: string
  name?: string
  slug?: string
  concept?: string
  clientName?: string
  clientSurname?: string
  courier?: string
  trackingCode?: string
  internalNumber?: number
  finalPriceUSD?: number
  amountUSD?: number
  deletedAt: string
}

interface PapeleraResponse {
  products: PapeleraItem[]
  categorias: PapeleraItem[]
  pedidos: PapeleraItem[]
  bultos: PapeleraItem[]
  transacciones: PapeleraItem[]
  tiendas: PapeleraItem[]
}

interface PapeleraModalProps {
  model: "products" | "categorias" | "pedidos" | "bultos" | "transacciones" | "tiendas"
  sectionLabel: string
  onRestore?: () => void
}

export function PapeleraModal({ model, sectionLabel, onRestore }: PapeleraModalProps) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<PapeleraItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchDeleted = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/papelera")
      const data: PapeleraResponse = await res.json()
      setItems(data[model] || [])
    } catch {
      toast.error("Error al cargar elementos eliminados")
    } finally {
      setLoading(false)
    }
  }, [model])

  useEffect(() => {
    if (open) fetchDeleted()
  }, [open, fetchDeleted])

  async function handleRestore(item: PapeleraItem) {
    try {
      const res = await fetch(`/api/papelera/${model}/${item.id}`, { method: "PATCH" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al restaurar")
      }
      toast.success("Elemento restaurado")
      fetchDeleted()
      onRestore?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al restaurar")
    }
  }

  async function handlePermanentDelete(item: PapeleraItem) {
    if (!confirm(`¿Eliminar permanentemente "${getItemName(item)}"? Esta acción no se puede deshacer.`)) return
    try {
      const res = await fetch(`/api/papelera/${model}/${item.id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al eliminar")
      }
      toast.success("Elemento eliminado permanentemente")
      fetchDeleted()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar")
    }
  }

  function getItemName(item: PapeleraItem): string {
    switch (model) {
      case "products": return item.name || ""
      case "categorias": return item.name || ""
      case "pedidos": return `${item.clientName || ""} ${item.clientSurname || ""}`.trim()
      case "bultos": {
        const tracking = item.courier && item.trackingCode ? `${item.courier} ${item.trackingCode}` : ""
        return tracking || `#${item.internalNumber}`
      }
      case "transacciones": return item.concept || ""
      case "tiendas": return item.name || ""
      default: return ""
    }
  }

  function getItemDetail(item: PapeleraItem): string {
    switch (model) {
      case "products": return `$${item.finalPriceUSD?.toFixed(2) || "0.00"} USD`
      case "pedidos": return `${item.clientName || ""} ${item.clientSurname || ""}`.trim()
      case "bultos": return item.courier && item.trackingCode ? `${item.courier} ${item.trackingCode}` : ""
      case "transacciones": return `$${item.amountUSD?.toFixed(2) || "0.00"} USD`
      default: return ""
    }
  }

  function formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}
        className="border-border text-xs gap-1.5 text-muted-foreground"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Ver eliminados
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card text-foreground max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              Elementos eliminados — {sectionLabel}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="text-center text-muted-foreground py-12">Cargando...</div>
          ) : items.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No hay elementos eliminados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Nombre</TableHead>
                  <TableHead className="text-muted-foreground">Detalle</TableHead>
                  <TableHead className="text-muted-foreground">Eliminado</TableHead>
                  <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="border-border hover:bg-muted">
                    <TableCell className="font-medium text-foreground">
                      {getItemName(item)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {getItemDetail(item)}
                    </TableCell>
                    <TableCell className="text-xs text-red-400">
                      {formatDate(item.deletedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRestore(item)}
                          className="text-muted-foreground hover:text-[#22C55E]"
                          title="Restaurar"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePermanentDelete(item)}
                          className="text-muted-foreground hover:text-red-400"
                          title="Eliminar permanentemente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
