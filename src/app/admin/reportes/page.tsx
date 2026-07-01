"use client"

import { useState } from "react"
import { FileText, Loader2, CheckCircle2, AlertCircle, Mail, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function ReportesPage() {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSend() {
    setSending(true)
    setSent(false)

    try {
      const res = await fetch("/api/reportes/enviar", { method: "POST" })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Error al enviar reporte")

      setSent(true)
      toast.success(data.message || "Reporte enviado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar reporte")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1d1d1f] font-heading">Reportes</h1>
        <p className="text-[#6e6e73] mt-1">Generá y enviá un reporte completo del negocio por email.</p>
      </div>

      <div className="bg-white border border-[#d2d2d7]/60 rounded-xl p-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-[#F59E0B]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[#1d1d1f] font-heading">Reporte completo del negocio</h2>
            <p className="text-sm text-[#6e6e73] leading-relaxed">
              El reporte incluye: productos por categoría, pedidos por estado, ingresos y egresos,
              productos con stock bajo, y más. Se envía al email del administrador.
            </p>
          </div>
        </div>

        <div className="bg-[#f5f5f7]/40 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-medium text-[#6e6e73]">Contenido del reporte</h3>
          <ul className="text-sm text-[#6e6e73] space-y-1.5">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] flex-shrink-0" />
              Productos: total, por categoría, destacados, disponibles
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] flex-shrink-0" />
              Pedidos: cantidad por estado, ingreso total, últimos 30 días
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] flex-shrink-0" />
              Finanzas: ingresos, egresos, balance
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] flex-shrink-0" />
              Stock bajo: productos por debajo del mínimo
            </li>
          </ul>
        </div>

        <Button
          onClick={handleSend}
          disabled={sending}
          className="w-full bg-[#0071e3] hover:bg-[#0077ed] text-white h-12 text-base gap-2"
        >
          {sending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generando y enviando...
            </>
          ) : sent ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Reporte enviado
            </>
          ) : (
            <>
              <Mail className="w-5 h-5" />
              Enviar reporte por email
            </>
          )}
        </Button>

        {sent && (
          <div className="flex items-center gap-2 text-sm text-[#22C55E] bg-[#0071e3]/5 rounded-lg p-3">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Reporte enviado exitosamente. Revisá tu casilla de email.
          </div>
        )}
      </div>

      <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-300/80">
            <p className="font-medium text-amber-300 mb-1">Configuración de email requerida</p>
            <p>
              Para que funcione el envío de reportes, primero configurá los datos SMTP en
              {" "}<a href="/admin/configuracion" className="text-amber-300 underline hover:text-amber-200 inline-flex items-center gap-1">
                <Settings className="w-3.5 h-3.5" /> Admin → Configuración
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
