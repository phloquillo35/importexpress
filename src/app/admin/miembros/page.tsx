"use client"

import { useState, useEffect } from "react"
import { UserPlus, Users, Mail, Key, User, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
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

interface Admin {
  id: string
  email: string
  name: string
  role: string
}

export default function MiembrosPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "customer" })
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "" })

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
      setForm({ email: "", password: "", name: "", role: "customer" })
      fetchAdmins()
    } catch {
      toast.error("Error al invitar miembro")
    } finally {
      setSaving(false)
    }
  }

  function openEdit(admin: Admin) {
    setEditingAdmin(admin)
    setEditForm({ name: admin.name, email: admin.email, role: admin.role })
  }

  async function handleEditSave() {
    if (!editingAdmin) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/admins/${editingAdmin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al actualizar")
      }
      toast.success("Miembro actualizado")
      setEditingAdmin(null)
      fetchAdmins()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(admin: Admin) {
    if (!confirm(`¿Eliminar a "${admin.name}"?`)) return
    try {
      const res = await fetch(`/api/admin/admins/${admin.id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al eliminar")
      }
      toast.success("Miembro eliminado")
      fetchAdmins()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar")
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
    <div>
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

          <div className="space-y-2">
            <Label className="text-muted-foreground">Rol</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v || "customer" })}>
              <SelectTrigger className="bg-muted border-border text-foreground">
                <SelectValue placeholder="Seleccionar rol">{(value) => value === "admin" ? "Admin" : value === "customer" ? "Customer" : "Seleccionar"}</SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[160px]">
              <UserPlus className="w-4 h-4 mr-2" />
              {saving ? "Invitando..." : "Invitar miembro"}
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-card border border-border rounded-xl space-y-0 overflow-hidden">
        <div className="p-6 pb-0">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground font-heading">Miembros actuales ({admins.length})</h2>
          </div>
        </div>

        {admins.length === 0 ? (
          <div className="p-6">
            <p className="text-muted-foreground text-sm">No hay miembros registrados</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    admin.role === "admin" ? "bg-[#22C55E]/10" : "bg-muted"
                  }`}>
                    <span className={`text-xs font-semibold ${
                      admin.role === "admin" ? "text-[#22C55E]" : "text-muted-foreground"
                    }`}>
                      {admin.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{admin.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        admin.role === "admin"
                          ? "bg-[#22C55E]/10 text-[#22C55E]"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {admin.role === "admin" ? "Admin" : "Customer"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(admin)}
                    className="text-muted-foreground hover:text-[#22C55E]"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(admin)}
                    className="text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editingAdmin} onOpenChange={(o) => { if (!o) setEditingAdmin(null) }}>
        <DialogContent className="bg-popover border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Editar miembro</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleEditSave() }}>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Nombre</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="bg-muted border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="bg-muted border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Rol</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v || "customer" })}>
                <SelectTrigger className="bg-muted border-border text-foreground">
                  <SelectValue placeholder="Seleccionar rol">{(value) => value === "admin" ? "Admin" : "Customer"}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditingAdmin(null)} className="text-muted-foreground">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
