"use client"

import { useState, useEffect, useCallback } from "react"
import { Package, DollarSign, TrendingDown, AlertTriangle, ShoppingCart } from "lucide-react"
import { formatUSD, formatDate } from "@/lib/utils"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Button } from "@/components/ui/button"

interface DashboardData {
  totalProducts: number
  lowStockProducts: { id: string; name: string; stock: number; minStock: number; slug: string }[]
  recentProducts: { id: string; name: string; priceUSD: number; createdAt: Date; category: { name: string } | null }[]
  transactions: { id: string; concept: string; amountUSD: number; type: string; date: Date }[]
  orders: { id: string; clientName: string; totalUSD: number; status: string; createdAt: Date; items: { id: string }[] }[]
  incomeUSD: number
  expenseUSD: number
  recentTransactions: { id: string; concept: string; amountUSD: number; type: string; date: Date }[]
  categories: { name: string; count: number }[]
}

const COLORS = ["#F59E0B", "#8B5CF6", "#22C55E", "#3B82F6", "#EF4444", "#EC4899", "#14B8A6", "#F97316"]

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  ordered: "Pedido",
  arrived: "Llegó",
  delivered: "Entregado",
  cancelled: "Cancelado",
}

export function DashboardClient({ data }: { data: DashboardData }) {
  const [period, setPeriod] = useState(30)
  const [chartData, setChartData] = useState<{ date: string; income: number; expense: number }[]>([])

  const buildChart = useCallback(() => {
    const filtered = data.recentTransactions.filter((t) => {
      const d = new Date(t.date)
      const since = new Date()
      since.setDate(since.getDate() - period)
      return d >= since
    })

    const grouped = filtered
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .reduce<{ date: string; income: number; expense: number }[]>((acc, t) => {
        const dateStr = new Date(t.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
        const last = acc[acc.length - 1]
        if (last && last.date === dateStr) {
          if (t.type === "income") last.income += t.amountUSD
          else last.expense += t.amountUSD
        } else {
          acc.push({ date: dateStr, income: t.type === "income" ? t.amountUSD : 0, expense: t.type === "expense" ? t.amountUSD : 0 })
        }
        return acc
      }, [])
    setChartData(grouped)
  }, [data.recentTransactions, period])

  useEffect(() => { buildChart() }, [buildChart])

  const balance = data.incomeUSD - data.expenseUSD

  const pieData = data.categories.filter((c) => c.count > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-1">Resumen general del negocio</p>
        </div>
        <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              variant={period === d ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod(d)}
              className={period === d ? "bg-[#22C55E] text-white" : "text-zinc-400"}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Package className="w-5 h-5" />} label="Total Productos" value={data.totalProducts} color="text-[#F59E0B]" bg="bg-[#F59E0B]/10" />
        <KpiCard icon={<AlertTriangle className="w-5 h-5" />} label="Stock Bajo" value={data.lowStockProducts.length} color="text-red-400" bg="bg-red-500/10" />
        <KpiCard icon={<DollarSign className="w-5 h-5" />} label="Ingresos del Período" value={formatUSD(data.incomeUSD)} color="text-[#22C55E]" bg="bg-[#22C55E]/10" />
        <KpiCard icon={<TrendingDown className="w-5 h-5" />} label="Egresos del Período" value={formatUSD(data.expenseUSD)} color="text-red-400" bg="bg-red-500/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 lg:p-6">
          <h2 className="text-lg font-semibold text-white font-heading mb-4">Ingresos / Egresos</h2>
          {chartData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", color: "#f4f4f5" }} />
                  <Line type="monotone" dataKey="income" stroke="#22C55E" strokeWidth={2} name="Ingresos" />
                  <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} name="Egresos" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-zinc-500 text-sm">No hay transacciones en este período</div>
          )}
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 lg:p-6">
          <h2 className="text-lg font-semibold text-white font-heading mb-4">Productos por categoría</h2>
          {pieData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="count" nameKey="name" paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", color: "#f4f4f5" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {pieData.slice(0, 5).map((c, i) => (
                  <span key={c.name} className="flex items-center gap-1 text-xs text-zinc-400">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-zinc-500 text-sm">Sin categorías</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 lg:p-6">
          <h2 className="text-lg font-semibold text-white font-heading mb-4">Stock Bajo</h2>
          {data.lowStockProducts.length > 0 ? (
            <div className="space-y-3">
              {data.lowStockProducts.slice(0, 5).map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                  <span className="text-sm text-zinc-200">{product.name}</span>
                  <span className="text-sm font-medium text-red-400">{product.stock} / {product.minStock}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
              <Package className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No hay productos con stock bajo</p>
            </div>
          )}
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 lg:p-6">
          <h2 className="text-lg font-semibold text-white font-heading mb-4">Últimos Pedidos</h2>
          {data.orders.length > 0 ? (
            <div className="space-y-3">
              {data.orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-sm text-zinc-200">{order.clientName}</p>
                    <p className="text-xs text-zinc-500">{order.items.length} producto(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-zinc-200">{formatUSD(order.totalUSD)}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      order.status === "pending" ? "bg-yellow-500/10 text-yellow-400" :
                      order.status === "delivered" ? "bg-zinc-500/10 text-zinc-400" :
                      order.status === "cancelled" ? "bg-red-500/10 text-red-400" :
                      "bg-[#22C55E]/10 text-[#22C55E]"
                    }`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
              <ShoppingCart className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">No hay pedidos aún</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 lg:p-6">
          <h2 className="text-lg font-semibold text-white font-heading mb-4">Últimos Productos</h2>
          {data.recentProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="text-left py-2 font-medium">Producto</th>
                    <th className="text-left py-2 font-medium">Categoría</th>
                    <th className="text-right py-2 font-medium">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentProducts.map((product) => (
                    <tr key={product.id} className="border-b border-zinc-800/50">
                      <td className="py-2.5 text-zinc-200">{product.name}</td>
                      <td className="py-2.5 text-zinc-400">{product.category?.name || "—"}</td>
                      <td className="py-2.5 text-zinc-200 text-right">{formatUSD(product.priceUSD)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
              <ShoppingCart className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">No hay productos aún</p>
            </div>
          )}
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 lg:p-6">
          <h2 className="text-lg font-semibold text-white font-heading mb-4">Últimas Transacciones</h2>
          {data.transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="text-left py-2 font-medium">Concepto</th>
                    <th className="text-left py-2 font-medium">Tipo</th>
                    <th className="text-right py-2 font-medium">Monto</th>
                    <th className="text-right py-2 font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((t) => (
                    <tr key={t.id} className="border-b border-zinc-800/50">
                      <td className="py-2.5 text-zinc-200">{t.concept}</td>
                      <td className="py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${t.type === "income" ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-red-500/10 text-red-400"}`}>
                          {t.type === "income" ? "Ingreso" : "Egreso"}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-zinc-200">{formatUSD(t.amountUSD)}</td>
                      <td className="py-2.5 text-right text-zinc-400 text-xs">{formatDate(t.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
              <DollarSign className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">No hay transacciones aún</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-white font-heading mb-4">Resumen Financiero</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-[#22C55E]/5 border border-[#22C55E]/10 rounded-lg">
            <p className="text-sm text-zinc-400">Total Ingresos</p>
            <p className="text-xl font-bold text-[#22C55E] mt-1">{formatUSD(data.incomeUSD)}</p>
          </div>
          <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-lg">
            <p className="text-sm text-zinc-400">Total Egresos</p>
            <p className="text-xl font-bold text-red-400 mt-1">{formatUSD(data.expenseUSD)}</p>
          </div>
          <div className="p-4 bg-[#F59E0B]/5 border border-[#F59E0B]/10 rounded-lg">
            <p className="text-sm text-zinc-400">Balance</p>
            <p className={`text-xl font-bold mt-1 ${balance >= 0 ? "text-[#22C55E]" : "text-red-400"}`}>{formatUSD(balance)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon, label, value, color, bg }: {
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
  bg: string
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 lg:p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${bg}`}>
          <div className={color}>{icon}</div>
        </div>
        <div>
          <p className="text-xs text-zinc-500">{label}</p>
          <p className={`text-lg font-bold ${color} mt-0.5`}>{value}</p>
        </div>
      </div>
    </div>
  )
}
