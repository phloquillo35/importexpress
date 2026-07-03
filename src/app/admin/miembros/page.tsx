"use client"

import { useState, useEffect } from "react"
import { UserPlus, Users, Mail, Key, User, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Admin {
  id: string
  email: string
  name: string
}

export default function MiembrosPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ email: "", password: "", name: "" })

  useEffect(() => {
    fetchAdmins()
  }, [])

  async function fetchAdmins() {
    try {
      const res = await fetch("/api/admin/admins")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAdmins(data.admins)
    } catch {
      toast.error("Error al cargar miembros")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/admin/invitar-miembro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Error al invitar miembro")
        return
      }
      toast.success("Miembro invitado exitosamente")
      setForm({ email: "", password: "", name: "" })
      fetchAdmins()
    } catch {
      toast.error("Error al invitar miembro")
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
        <h1 className="text-2xl font-bold text-foreground font-heading">Miembros</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestioná los administradores del sistema</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5 mb-6">
        <div className="flex items-center gap-3">
          <UserPlus className="w-5 h-5 text-[#0071e3]" />
          <h2 className="text-lg font-semibold text-foreground font-heading">Invitar nuevo miembro</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-muted-foreground">Nombre</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-muted border-border text-foreground pl-10"
                placeholder="Nombre del administrador"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-muted-foreground">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-muted border-border text-foreground pl-10"
                placeholder="email@ejemplo.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-muted-foreground">Contraseña</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="bg-muted border-border text-foreground pl-10"
                placeholder="Contraseña segura"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[160px]">
              <UserPlus className="w-4 h-4 mr-2" />
              {saving ? "Invitando..." : "Invitar miembro"}
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground font-heading">Miembros actuales ({admins.length})</h2>
        </div>

        {admins.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay miembros registrados</p>
        ) : (
          <div className="space-y-2">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-[#0071e3]">
                      {admin.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{admin.name}</p>
                    <p className="text-xs text-muted-foreground">{admin.email}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
