"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { clearExchangeRateCache } from "@/lib/client-exchange-rate"
import { Save, Mail, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function AccesoRestringido() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <ShieldAlert className="w-10 h-10 text-muted-foreground mb-3" />
      <p className="text-foreground font-medium">Acceso restringido</p>
      <p className="text-muted-foreground text-sm mt-1">Esta sección es solo para administradores.</p>
    </div>
  )
}

export default function ConfiguracionPage() {
  const { data: session, status } = useSession()
  const isAdmin = session?.user?.role === "admin"
  const [form, setForm] = useState({
    exchange_rate: "",
    usdt_rate: "",
    business_name: "",
    whatsapp: "",
    whatsapp_david: "",
    whatsapp_david_name: "",
    whatsapp_brian: "",
    whatsapp_brian_name: "",
    instagram: "",
    smtp_from: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status !== "authenticated" || !isAdmin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }
    fetch("/api/configuracion")
      .then(r => r.json())
      .then(data => {
        setForm({
          exchange_rate: data.exchange_rate || "",
          usdt_rate: data.usdt_rate || "",
          business_name: data.business_name || "",
          whatsapp: data.whatsapp || "",
          whatsapp_david: data.whatsapp_david || "",
          whatsapp_david_name: data.whatsapp_david_name || "",
          whatsapp_brian: data.whatsapp_brian || "",
          whatsapp_brian_name: data.whatsapp_brian_name || "",
          instagram: data.instagram || "",
          smtp_from: data.smtp_from || "",
        })
      })
      .catch(() => toast.error("Error al cargar configuración"))
      .finally(() => setLoading(false))
  }, [status, isAdmin])

  // Normaliza un número de WhatsApp: quita todo lo no numérico y antepone 549 si falta.
  function normalizeWhatsAppNumber(input: string): string {
    const digits = input.replace(/\D/g, "")
    if (!digits) return ""
    return digits.startsWith("549") ? digits : `549${digits}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        whatsapp_david: normalizeWhatsAppNumber(form.whatsapp_david),
        whatsapp_brian: normalizeWhatsAppNumber(form.whatsapp_brian),
      }
      const res = await fetch("/api/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      clearExchangeRateCache()
      toast.success("Configuración guardada")
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  if (status === "authenticated" && !isAdmin) {
    return <AccesoRestringido />
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground font-heading">Configuración</h1>
          <p className="text-muted-foreground text-sm mt-1">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground font-heading">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">Ajustes generales del sistema</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-foreground font-heading">Información del negocio</h2>

          <div className="space-y-2">
            <Label htmlFor="business_name" className="text-muted-foreground">Nombre del negocio</Label>
            <Input
              id="business_name"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              className="bg-muted border-border text-foreground"
              placeholder="Lo Pedís, Lo Tenes"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exchange_rate" className="text-muted-foreground">Tipo de cambio USD → ARS</Label>
            <Input
              id="exchange_rate"
              type="number"
              value={form.exchange_rate}
              onChange={(e) => setForm({ ...form, exchange_rate: e.target.value })}
              className="bg-muted border-border text-foreground"
              placeholder="1200"
            />
            <p className="text-xs text-muted-foreground">Usado para calcular precios de referencia en ARS</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="usdt_rate" className="text-muted-foreground">Tipo de cambio USDT → ARS</Label>
            <Input
              id="usdt_rate"
              type="number"
              value={form.usdt_rate}
              onChange={(e) => setForm({ ...form, usdt_rate: e.target.value })}
              className="bg-muted border-border text-foreground"
              placeholder="1400"
            />
            <p className="text-xs text-muted-foreground">Usado para convertir costos USDT a ARS en productos</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-foreground font-heading">Contacto</h2>

          <div className="space-y-2">
            <Label htmlFor="whatsapp_david" className="text-muted-foreground">WhatsApp — David Adbes</Label>
            <Input
              id="whatsapp_david"
              value={form.whatsapp_david}
              onChange={(e) => setForm({ ...form, whatsapp_david: e.target.value })}
              className="bg-muted border-border text-foreground"
              placeholder="3813360558"
            />
            <p className="text-xs text-muted-foreground">Número sin + ni espacios. Se guarda con prefijo 549 automáticamente.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp_david_name" className="text-muted-foreground">Nombre — David Adbes</Label>
            <Input
              id="whatsapp_david_name"
              value={form.whatsapp_david_name}
              onChange={(e) => setForm({ ...form, whatsapp_david_name: e.target.value })}
              className="bg-muted border-border text-foreground"
              placeholder="David Adbes"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp_brian" className="text-muted-foreground">WhatsApp — Brian Carrizo</Label>
            <Input
              id="whatsapp_brian"
              value={form.whatsapp_brian}
              onChange={(e) => setForm({ ...form, whatsapp_brian: e.target.value })}
              className="bg-muted border-border text-foreground"
              placeholder="3816658420"
            />
            <p className="text-xs text-muted-foreground">Número sin + ni espacios. Se guarda con prefijo 549 automáticamente.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp_brian_name" className="text-muted-foreground">Nombre — Brian Carrizo</Label>
            <Input
              id="whatsapp_brian_name"
              value={form.whatsapp_brian_name}
              onChange={(e) => setForm({ ...form, whatsapp_brian_name: e.target.value })}
              className="bg-muted border-border text-foreground"
              placeholder="Brian Carrizo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram" className="text-muted-foreground">Instagram</Label>
            <Input
              id="instagram"
              value={form.instagram}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              className="bg-muted border-border text-foreground"
              placeholder="@importexpress"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground font-heading">Email — Reportes</h2>
          </div>
          <p className="text-sm text-muted-foreground -mt-2">
            Los reportes salen por Brevo (ya configurado en el servidor). Solo hace falta indicar acá el email que
            quede verificado como remitente en la cuenta de Brevo.
          </p>

          <div className="space-y-2">
            <Label htmlFor="smtp_from" className="text-muted-foreground">Email remitente</Label>
            <Input
              id="smtp_from"
              value={form.smtp_from}
              onChange={(e) => setForm({ ...form, smtp_from: e.target.value })}
              className="bg-muted border-border text-foreground"
              placeholder="reportes@tudominio.com"
            />
            <p className="text-xs text-muted-foreground">
              Tiene que estar verificado como remitente en la cuenta de Brevo (Senders &amp; IP → Senders), si no los emails no salen.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[160px]">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Guardando..." : "Guardar configuración"}
          </Button>
        </div>
      </form>
    </div>
  )
}
