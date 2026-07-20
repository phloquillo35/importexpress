"use client"

import { useState, useEffect } from "react"
import { Trash2, RotateCcw, Package, Tags, ShoppingCart, Ship, DollarSign, Store, Search } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface TrashItem {
  id: string
  name?: string
  slug?: string
  internalNumber?: number
  clientName?: string
  clientSurname?: string
  concept?: string
  courier?: string
  trackingCode?: string
  type?: string
  finalPriceUSD?: number
  amountUSD?: number
  deletedAt: string
}

interface TrashData {
  products: TrashItem[]
  categorias: TrashItem[]
  pedidos: TrashItem[]
  bultos: TrashItem[]
  transacciones: TrashItem[]
  tiendas: TrashItem[]
}

const SECTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  products: { label: "Productos", icon: Package, color: "text-blue-500" },
  categorias: { label: "Categorías", icon: Tags, color: "text-green-500" },
  pedidos: { label: "Pedidos", icon: ShoppingCart, color: "text-orange-500" },
  bultos: { label: "Bultos", icon: Ship, color: "text-purple-500" },
  transacciones: { label: "Transacciones", icon: DollarSign, color: "text-emerald-500" },
  tiendas: { label: "Tiendas", icon: Store, color: "text-pink-500" },
}

export default function PapeleraPage() {
  const [data, setData] = useState<TrashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [restoring, setRestoring] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchTrash()
  }, [])

  async function fetchTrash() {
    try {
      setLoading(true)
      const res = await fetch("/api/papelera")
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(json)
    } catch {
      toast.error("Error al cargar papelera")
    } finally {
      setLoading(false)
    }
  }

  async function handleRestore(model: string, id: string) {
    try {
      setRestoring(`${model}-${id}`)
      const res = await fetch(`/api/papelera/${model}/${id}`, { method: "PATCH" })
      if (!res.ok) throw new Error()
      toast.success("Elemento restaurado")
      fetchTrash()
    } catch {
      toast.error("Error al restaurar")
    } finally {
      setRestoring(null)
    }
  }

  async function handlePermanentDelete(model: string, id: string) {
    if (!confirm("¿Eliminar permanentemente? Esta acción no se puede deshacer.")) return
    try {
      setDeleting(`${model}-${id}`)
      const res = await fetch(`/api/papelera/${model}/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Elemento eliminado permanentemente")
      fetchTrash()
    } catch {
      toast.error("Error al eliminar")
    } finally {
      setDeleting(null)
    }
  }

  function getItemName(section: string, item: TrashItem): string {
    if (item.name) return item.name
    if (item.clientName) return `${item.clientName} ${item.clientSurname || ""}`
    if (item.concept) return item.concept
    if (item.internalNumber) return `#${item.internalNumber}`
    return item.slug || item.id.slice(0, 8)
  }

  function getItemSubtitle(section: string, item: TrashItem): string {
    if (section === "products" && item.finalPriceUSD) return `$${item.finalPriceUSD} USD`
    if (section === "pedidos" && item.clientName) return `${item.clientName} ${item.clientSurname || ""}`
    if (section === "bultos") return `${item.courier || ""} ${item.trackingCode || ""}`.trim() || `#${item.internalNumber}`
    if (section === "transacciones" && item.amountUSD) return `$${item.amountUSD} USD`
    return ""
  }

  const totalItems = data
    ? Object.values(data).reduce((sum, arr) => sum + arr.length, 0)
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trash2 className="w-6 h-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Papelera</h1>
            <p className="text-sm text-muted-foreground">{totalItems} elemento(s) eliminados</p>
          </div>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en papelera..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {totalItems === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">La papelera está vacía</p>
          <p className="text-sm">Los elementos eliminados aparecerán aquí</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(SECTION_CONFIG).map(([key, config]) => {
            const items = data?.[key as keyof TrashData] || []
            const filtered = items.filter((item) =>
              getItemName(key, item).toLowerCase().includes(search.toLowerCase())
            )
            if (filtered.length === 0) return null

            const Icon = config.icon
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`w-5 h-5 ${config.color}`} />
                  <h2 className="text-lg font-semibold">{config.label}</h2>
                  <span className="text-sm text-muted-foreground">({filtered.length})</span>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left p-3 font-medium">Nombre</th>
                        <th className="text-left p-3 font-medium hidden md:table-cell">Detalle</th>
                        <th className="text-left p-3 font-medium hidden sm:table-cell">Eliminado</th>
                        <th className="text-right p-3 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item) => (
                        <tr key={item.id} className="border-t hover:bg-muted/30">
                          <td className="p-3 font-medium">{getItemName(key, item)}</td>
                          <td className="p-3 text-muted-foreground hidden md:table-cell">
                            {getItemSubtitle(key, item)}
                          </td>
                          <td className="p-3 text-muted-foreground hidden sm:table-cell">
                            {new Date(item.deletedAt).toLocaleDateString("es-AR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestore(key, item.id)}
                                disabled={restoring === `${key}-${item.id}`}
                              >
                                <RotateCcw className="w-4 h-4 mr-1" />
                                Restaurar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handlePermanentDelete(key, item.id)}
                                disabled={deleting === `${key}-${item.id}`}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
