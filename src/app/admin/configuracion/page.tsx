"use client"

import { useEffect, useState } from "react"
import { clearExchangeRateCache } from "@/lib/exchange-rate"
import { Save, Mail } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ConfiguracionPage() {
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
    smtp_host: "",
    smtp_port: "587",
    smtp_user: "",
    smtp_pass: "",
    smtp_from: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
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
          smtp_host: data.smtp_host || "",
          smtp_port: data.smtp_port || "587",
          smtp_user: data.smtp_user || "",
          smtp_pass: data.smtp_pass || "",
          smtp_from: data.smtp_from || "",
        })
      })
      .catch(() => toast.error("Error al cargar configuración"))
      .finally(() => setLoading(false))
  }, [])

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
            <h2 className="text-lg font-semibold text-foreground font-heading">Email (SMTP) — Reportes</h2>
          </div>
          <p className="text-sm text-muted-foreground -mt-2">Configuración necesaria para enviar reportes por email desde Admin → Reportes</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_host" className="text-muted-foreground">Servidor SMTP</Label>
              <Input
                id="smtp_host"
                value={form.smtp_host}
                onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
                className="bg-muted border-border text-foreground"
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_port" className="text-muted-foreground">Puerto</Label>
              <Input
                id="smtp_port"
                type="number"
                value={form.smtp_port}
                onChange={(e) => setForm({ ...form, smtp_port: e.target.value })}
                className="bg-muted border-border text-foreground"
                placeholder="587"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_user" className="text-muted-foreground">Usuario</Label>
              <Input
                id="smtp_user"
                value={form.smtp_user}
                onChange={(e) => setForm({ ...form, smtp_user: e.target.value })}
                className="bg-muted border-border text-foreground"
                placeholder="tu-email@gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_pass" className="text-muted-foreground">Contraseña</Label>
              <Input
                id="smtp_pass"
                type="password"
                value={form.smtp_pass}
                onChange={(e) => setForm({ ...form, smtp_pass: e.target.value })}
                className="bg-muted border-border text-foreground"
                placeholder="Contraseña de aplicación"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp_from" className="text-muted-foreground">Email remitente</Label>
            <Input
              id="smtp_from"
              value={form.smtp_from}
              onChange={(e) => setForm({ ...form, smtp_from: e.target.value })}
              className="bg-muted border-border text-foreground"
              placeholder="tu-email@gmail.com (si no se completa, usa el usuario)"
            />
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
