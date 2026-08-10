"use client"

import { useEffect } from "react"
import { MessageCircle, X } from "lucide-react"
import { useWhatsAppConfig } from "@/hooks/useWhatsAppConfig"
import { lockScroll, unlockScroll } from "@/lib/utils"

interface WhatsAppAgentSelectorProps {
  open: boolean
  onClose: () => void
  message?: string
  title?: string
}

export function WhatsAppAgentSelector({
  open,
  onClose,
  message = "",
  title = "Contactar por WhatsApp",
}: WhatsAppAgentSelectorProps) {
  const { agents, loading, error } = useWhatsAppConfig()

  useEffect(() => {
    if (open) {
      lockScroll()
      return unlockScroll
    }
  }, [open])

  if (!open) return null

  function handleSelect(number: string) {
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between px-5 pt-5 pb-2">
          <div>
            <h2 className="font-heading font-semibold text-foreground text-lg">{title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Elegí con quién hablar</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 space-y-2.5">
          {loading && (
            <div className="space-y-2.5">
              <div className="h-16 bg-muted animate-pulse rounded-xl" />
              <div className="h-16 bg-muted animate-pulse rounded-xl" />
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No pudimos cargar los contactos. Intentá de nuevo más tarde.</p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-full transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}

          {!loading && !error && agents.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No hay contactos de WhatsApp disponibles.</p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-full transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}

          {!loading && !error && agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => handleSelect(agent.number)}
              className="w-full flex items-center gap-3 p-3 bg-muted hover:bg-muted/70 rounded-xl transition-colors text-left"
            >
              <span className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                {agent.name.charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-foreground truncate">{agent.name}</span>
                <span className="block text-xs text-muted-foreground">{agent.displayNumber}</span>
              </span>
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground shrink-0">
                <MessageCircle className="w-5 h-5" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}