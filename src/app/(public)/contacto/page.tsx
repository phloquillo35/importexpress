"use client"

import { MessageCircle, Camera, Mail, MapPin } from "lucide-react"
import { useWhatsAppConfig } from "@/hooks/useWhatsAppConfig"
import { Skeleton } from "@/components/ui/skeleton"

const staticCards = [
  {
    key: "instagram",
    icon: Camera,
    label: "Instagram",
    value: "@lopedis_lotenes.01",
    href: "https://instagram.com/lopedis_lotenes.01",
    action: "Seguinos",
    color: "text-primary",
    bg: "bg-primary/10",
    hover: "hover:bg-[#0071e3]/20",
  },
  {
    key: "email",
    icon: Mail,
    label: "Email",
    value: "info@importexpress.com",
    href: "mailto:info@importexpress.com",
    action: "Enviar mail",
    color: "text-primary",
    bg: "bg-primary/10",
    hover: "hover:bg-[#0071e3]/20",
  },
]

export default function ContactoPage() {
  const { agents, loading } = useWhatsAppConfig()

  const whatsAppCards = agents.map((agent) => ({
    key: `whatsapp-${agent.id}`,
    icon: MessageCircle,
    label: agent.name,
    value: agent.displayNumber,
    href: `https://wa.me/${agent.number}`,
    action: "Escribinos",
    color: "text-[#0071e3]",
    bg: "bg-[#0071e3]/10",
    hover: "hover:bg-[#0071e3]/20",
  }))

  const cards = [...whatsAppCards, ...staticCards]

  return (
    <div>
      <div className="border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 lg:py-20 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground font-heading mb-4">
            Contacto
          </h1>
          <p className="text-foreground/70 dark:text-muted-foreground max-w-xl mx-auto">
            Estamos para ayudarte. Elegí el canal que prefieras
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto mb-16">
          {loading && (
            <>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-center gap-4 p-8 bg-card rounded-2xl border border-border/60">
                  <Skeleton className="w-16 h-16 rounded-xl bg-muted" />
                  <div className="text-center space-y-2">
                    <Skeleton className="h-5 w-24 bg-muted mx-auto" />
                    <Skeleton className="h-4 w-32 bg-muted mx-auto" />
                  </div>
                  <Skeleton className="h-4 w-20 bg-muted" />
                </div>
              ))}
            </>
          )}

          {!loading && cards.map((item) => {
            const Icon = item.icon
            return (
              <a
                key={item.key}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-col items-center gap-4 p-8 bg-card rounded-2xl border border-border/60 ${item.hover} transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:scale-[1.02]`}
              >
                <div className={`p-4 rounded-xl ${item.bg} group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-8 h-8 ${item.color}`} />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground font-heading">{item.label}</p>
                  <p className="text-sm text-muted-foreground mt-1">{item.value}</p>
                </div>
                <span className={`text-sm font-medium ${item.color}`}>
                  {item.action} →
                </span>
              </a>
            )
          })}
        </div>

        <div className="max-w-lg mx-auto rounded-2xl border border-border/60 p-8 text-center bg-card/10 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-xl bg-card/20 flex items-center justify-center mx-auto mb-4 border border-white/30">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground font-heading mb-2">Ubicación</h3>
          <p className="text-foreground/70 dark:text-muted-foreground">
            Tucumán, Argentina
          </p>
          <p className="text-foreground/70 dark:text-muted-foreground text-sm mt-2">
            Importamos desde Ciudad del Este, Paraguay con envíos a todo el país
          </p>
        </div>
      </div>
    </div>
  )
}