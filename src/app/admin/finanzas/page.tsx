"use client"

import { useEffect, useState, useCallback } from "react"
import { DollarSign, TrendingDown, Plus, ArrowUpDown } from "lucide-react"
import { toast } from "sonner"
import { formatUSD, formatDate } from "@/lib/utils"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
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

interface Transaction {
  id: string
  type: string
  concept: string
  amountUSD: number
  amountARS: number | null
  date: string
  notes: string | null
}

export default function FinanzasPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [tipoFilter, setTipoFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ type: "income", concept: "", amountUSD: "", amountARS: "", date: "", notes: "" })
  const [saving, setSaving] = useState(false)
  const [income, setIncome] = useState(0)
  const [expense, setExpense] = useState(0)

  const fetchTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (tipoFilter) params.set("tipo", tipoFilter)
      const res = await fetch(`/api/transacciones?${params}`)
      const data = await res.json()
      setTransactions(Array.isArray(data) ? data : [])

      let inc = 0, exp = 0
      ;(Array.isArray(data) ? data : []).forEach((t: Transaction) => {
        if (t.type === "income") inc += t.amountUSD
        else exp += t.amountUSD
      })
      setIncome(inc)
      setExpense(exp)
    } catch {
      toast.error("Error al cargar transacciones")
    } finally {
      setLoading(false)
    }
  }, [tipoFilter])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  const balance = income - expense

  const monthlyData = transactions
    .filter((t) => {
      const d = new Date(t.date)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      return d >= sixMonthsAgo
    })
    .reduce<Record<string, { income: number; expense: number }>>((acc, t) => {
      const d = new Date(t.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      if (!acc[key]) acc[key] = { income: 0, expense: 0 }
      if (t.type === "income") acc[key].income += t.amountUSD
      else acc[key].expense += t.amountUSD
      return acc
    }, {})

  const chartData = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, values]) => ({
      month: new Date(month + "-01").toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
      income: values.income,
      expense: values.expense,
    }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.concept || !form.amountUSD) {
      toast.error("Completá concepto y monto")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/transacciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al crear transacción")
      }
      toast.success("Transacción creada")
      setDialogOpen(false)
      setForm({ type: "income", concept: "", amountUSD: "", amountARS: "", date: "", notes: "" })
      fetchTransactions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear transacción")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1d1d1f] font-heading">Finanzas</h1>
          <p className="text-[#6e6e73] text-sm mt-1">Gestión de ingresos y egresos</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-[#0071e3] hover:bg-[#0077ed] text-white">
          <Plus className="w-4 h-4 mr-2" /> Nueva transacción
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#d2d2d7]/60 rounded-xl p-5">
          <p className="text-sm text-[#6e6e73]">Ingresos</p>
          <p className="text-2xl font-bold text-[#22C55E] mt-1">{formatUSD(income)}</p>
        </div>
        <div className="bg-white border border-[#d2d2d7]/60 rounded-xl p-5">
          <p className="text-sm text-[#6e6e73]">Egresos</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{formatUSD(expense)}</p>
        </div>
        <div className="bg-white border border-[#d2d2d7]/60 rounded-xl p-5">
          <p className="text-sm text-[#6e6e73]">Balance</p>
          <p className={`text-2xl font-bold mt-1 ${balance >= 0 ? "text-[#22C55E]" : "text-red-400"}`}>
            {formatUSD(balance)}
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#d2d2d7]/60 rounded-xl p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-[#1d1d1f] font-heading mb-4">Evolución (6 meses)</h2>
        {chartData.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", color: "#f4f4f5" }} />
                <Line type="monotone" dataKey="income" stroke="#22C55E" strokeWidth={2} name="Ingresos" />
                <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} name="Egresos" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex items-center justify-center text-[#6e6e73] text-sm">Sin datos</div>
        )}
      </div>

      <div className="bg-white border border-[#d2d2d7]/60 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#d2d2d7]/60 flex items-center gap-3">
          <h2 className="text-lg font-semibold text-[#1d1d1f] font-heading flex-1">Transacciones</h2>
          <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v || "")}>
            <SelectTrigger className="w-36 bg-[#f5f5f7] border-[#d2d2d7]/60 text-[#1d1d1f]">
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent className=" bg-white text-[#1d1d1f]">
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="income">Ingresos</SelectItem>
              <SelectItem value="expense">Egresos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-[#d2d2d7]/60 hover:bg-transparent">
              <TableHead className="text-[#6e6e73]">Concepto</TableHead>
              <TableHead className="text-[#6e6e73]">Tipo</TableHead>
              <TableHead className="text-[#6e6e73] text-right">Monto USD</TableHead>
              <TableHead className="text-[#6e6e73] text-right hidden sm:table-cell">Monto ARS</TableHead>
              <TableHead className="text-[#6e6e73] text-right">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-[#6e6e73] py-12">Cargando...</TableCell></TableRow>
            ) : transactions.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-[#6e6e73] py-12"><DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>Sin transacciones</p></TableCell></TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow key={t.id} className="border-[#d2d2d7]/60 hover:bg-[#f5f5f7]">
                  <TableCell className="text-[#1d1d1f]">{t.concept}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.type === "income" ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-red-500/10 text-red-400"}`}>
                      {t.type === "income" ? "Ingreso" : "Egreso"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-[#1d1d1f]">{formatUSD(t.amountUSD)}</TableCell>
                  <TableCell className="text-right text-[#6e6e73] text-sm hidden sm:table-cell">
                    {t.amountARS ? `$${t.amountARS.toLocaleString("es-AR")}` : "—"}
                  </TableCell>
                  <TableCell className="text-right text-[#6e6e73] text-sm">{formatDate(t.date)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className=" bg-white text-[#1d1d1f]">
          <DialogHeader><DialogTitle>Nueva transacción</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v || "income" })}>
                <SelectTrigger className="bg-[#f5f5f7] border-[#d2d2d7]/60 text-[#1d1d1f]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className=" bg-white text-[#1d1d1f]">
                  <SelectItem value="income">Ingreso</SelectItem>
                  <SelectItem value="expense">Egreso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} className="bg-[#f5f5f7] border-[#d2d2d7]/60 text-[#1d1d1f]" placeholder="Venta de productos, pago a proveedor..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto USD *</Label>
                <Input type="number" step="0.01" value={form.amountUSD} onChange={(e) => setForm({ ...form, amountUSD: e.target.value })} className="bg-[#f5f5f7] border-[#d2d2d7]/60 text-[#1d1d1f]" />
              </div>
              <div className="space-y-2">
                <Label>Monto ARS</Label>
                <Input type="number" value={form.amountARS} onChange={(e) => setForm({ ...form, amountARS: e.target.value })} className="bg-[#f5f5f7] border-[#d2d2d7]/60 text-[#1d1d1f]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="bg-[#f5f5f7] border-[#d2d2d7]/60 text-[#1d1d1f]" />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-[#f5f5f7] border-[#d2d2d7]/60 text-[#1d1d1f]" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-[#6e6e73]">Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-[#0071e3] hover:bg-[#0077ed] text-white">{saving ? "Guardando..." : "Crear"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
