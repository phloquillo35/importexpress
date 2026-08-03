"use client"

import { useState, useEffect, useRef } from "react"
import { FileText, Loader2, CheckCircle2, AlertCircle, Mail, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

const tiposReporte = [
  { value: "completo", label: "Reporte completo" },
  { value: "ventas", label: "Ventas" },
  { value: "stock", label: "Stock" },
  { value: "finanzas", label: "Finanzas" },
]

export default function ReportesPage() {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState("")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [tipo, setTipo] = useState("completo")
  const [smtpConfigurado, setSmtpConfigurado] = useState(true)
  const sentEmailRef = useRef("")
  const sentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (sentTimeoutRef.current) clearTimeout(sentTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    fetch("/api/configuracion")
      .then((r) => r.json())
      .then((data) => setSmtpConfigurado(Boolean(data.smtp_host)))
      .catch(() => setSmtpConfigurado(true))
  }, [])

  async function handleSend() {
    if (!email.trim()) {
      toast.error("El email destino es requerido")
      return
    }

    setSending(true)
    setSent(false)
    if (sentTimeoutRef.current) {
      clearTimeout(sentTimeoutRef.current)
      sentTimeoutRef.current = null
    }

    try {
      const res = await fetch("/api/reportes/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          fechaDesde: fechaDesde || undefined,
          fechaHasta: fechaHasta || undefined,
          tipo,
        }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Error al enviar reporte")

      sentEmailRef.current = email.trim()
      setSent(true)
      setEmail("")
      setFechaDesde("")
      setFechaHasta("")
      toast.success(data.message || "Reporte enviado")
      sentTimeoutRef.current = setTimeout(() => setSent(false), 3000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar reporte")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground font-heading">Reportes</h1>
        <p className="text-muted-foreground mt-1">Generá y enviá un reporte del negocio por email.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-[#F59E0B]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground font-heading">Configurar y enviar reporte</h2>
            <p className="text-sm text-muted-foreground">
              Completá los campos y enviá el reporte al email que prefieras.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-muted-foreground">Email destino *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-muted border-border text-foreground"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fechaDesde" className="text-muted-foreground">Fecha desde</Label>
              <Input
                id="fechaDesde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="bg-muted border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaHasta" className="text-muted-foreground">Fecha hasta</Label>
              <Input
                id="fechaHasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="bg-muted border-border text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Tipo de reporte</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {tiposReporte.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    tipo === t.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-muted/40 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Contenido del reporte</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5">
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
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base gap-2"
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
          <div className="flex items-center gap-2 text-sm text-[#22C55E] bg-primary/5 rounded-lg p-3">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Reporte enviado exitosamente a {sentEmailRef.current}.
          </div>
        )}
      </div>

      {!smtpConfigurado && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Configuración de email requerida</p>
              <p>
                Para que funcione el envío de reportes, primero configurá los datos SMTP en
                {" "}<a href="/admin/configuracion" className="text-primary underline hover:text-primary/80 inline-flex items-center gap-1">
                  <Settings className="w-3.5 h-3.5" /> Admin → Configuración
                </a>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}