"use client"

import { MessageCircle, Camera, Mail, MapPin } from "lucide-react"
import Link from "next/link"

const contactInfo = [
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "+54 9 11 2345-6789",
    href: "https://wa.me/5491123456789",
    action: "Escribinos",
    color: "text-[#34c759]",
    bg: "bg-[#34c759]/10",
    hover: "hover:bg-[#34c759]/20",
  },
  {
    icon: Camera,
    label: "Instagram",
    value: "@lopedis_lotenes.01",
    href: "https://instagram.com/lopedis_lotenes.01",
    action: "Seguinos",
    color: "text-[#0071e3]",
    bg: "bg-[#0071e3]/10",
    hover: "hover:bg-[#0071e3]/20",
  },
  {
    icon: Mail,
    label: "Email",
    value: "info@importexpress.com",
    href: "mailto:info@importexpress.com",
    action: "Enviar mail",
    color: "text-[#0071e3]",
    bg: "bg-[#0071e3]/10",
    hover: "hover:bg-[#0071e3]/20",
  },
]

export default function ContactoPage() {
  return (
    <div>
      <div className="border-b border-[#d2d2d7]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 lg:py-20 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-heading mb-4">
            Contacto
          </h1>
          <p className="text-white/70 max-w-xl mx-auto">
            Estamos para ayudarte. Elegí el canal que prefieras
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
          {contactInfo.map((item) => {
            const Icon = item.icon
            return (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-col items-center gap-4 p-8 bg-white rounded-2xl border border-[#d2d2d7]/60 ${item.hover} transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:scale-[1.02]`}
              >
                <div className={`p-4 rounded-xl ${item.bg} group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-8 h-8 ${item.color}`} />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-[#1d1d1f] font-heading">{item.label}</p>
                  <p className="text-sm text-[#6e6e73] mt-1">{item.value}</p>
                </div>
                <span className={`text-sm font-medium ${item.color}`}>
                  {item.action} →
                </span>
              </a>
            )
          })}
        </div>

        <div className="max-w-lg mx-auto rounded-2xl border border-[#d2d2d7]/60 p-8 text-center bg-white/10 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-4 border border-white/30">
            <MapPin className="w-6 h-6 text-[#0071e3]" />
          </div>
          <h3 className="text-lg font-semibold text-white font-heading mb-2">Ubicación</h3>
          <p className="text-white/70">
            Tucumán, Argentina
          </p>
          <p className="text-white/70 text-sm mt-2">
            Importamos desde Punta del Este con envíos a todo el país
          </p>
        </div>
      </div>
    </div>
  )
}
