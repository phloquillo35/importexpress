"use client"

import { useEffect, useState } from "react"
import { Settings, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ConfiguracionPage() {
  const [form, setForm] = useState({
    exchange_rate: "",
    business_name: "",
    whatsapp: "",
    instagram: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/configuracion")
      .then(r => r.json())
      .then(data => {
        setForm({
          exchange_rate: data.exchange_rate || "",
          business_name: data.business_name || "",
          whatsapp: data.whatsapp || "",
          instagram: data.instagram || "",
        })
      })
      .catch(() => toast.error("Error al cargar configuración"))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast.success("Configuración guardada")
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-6 h-6 border-2 border-[#22C55E] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white font-heading">Configuración</h1>
        <p className="text-zinc-400 text-sm mt-1">Ajustes generales del sistema</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white font-heading">Información del negocio</h2>

          <div className="space-y-2">
            <Label htmlFor="business_name" className="text-zinc-300">Nombre del negocio</Label>
            <Input
              id="business_name"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white"
              placeholder="Lo Pedís, Lo Tenes"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exchange_rate" className="text-zinc-300">Tipo de cambio USD → ARS</Label>
            <Input
              id="exchange_rate"
              type="number"
              value={form.exchange_rate}
              onChange={(e) => setForm({ ...form, exchange_rate: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white"
              placeholder="1200"
            />
            <p className="text-xs text-zinc-500">Usado para calcular precios en ARS automáticamente</p>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white font-heading">Contacto</h2>

          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="text-zinc-300">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white"
              placeholder="5491123456789"
            />
            <p className="text-xs text-zinc-500">Número sin + ni espacios. Ej: 5491123456789</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram" className="text-zinc-300">Instagram</Label>
            <Input
              id="instagram"
              value={form.instagram}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white"
              placeholder="@importexpress"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="bg-[#22C55E] hover:bg-[#16A34A] text-white min-w-[160px]">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Guardando..." : "Guardar configuración"}
          </Button>
        </div>
      </form>
    </div>
  )
}
