import { MessageCircle, Camera, Mail, MapPin } from "lucide-react"

const contactInfo = [
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "+54 9 11 2345-6789",
    href: "https://wa.me/5491123456789",
    action: "Escribinos",
    color: "text-[#22C55E]",
    bg: "bg-[#22C55E]/10",
    hover: "hover:bg-[#22C55E]/20",
  },
  {
    icon: Camera,
    label: "Instagram",
    value: "@importexpress",
    href: "https://instagram.com/importexpress",
    action: "Seguinos",
    color: "text-[#8B5CF6]",
    bg: "bg-[#8B5CF6]/10",
    hover: "hover:bg-[#8B5CF6]/20",
  },
  {
    icon: Mail,
    label: "Email",
    value: "info@importexpress.com",
    href: "mailto:info@importexpress.com",
    action: "Enviar mail",
    color: "text-[#F59E0B]",
    bg: "bg-[#F59E0B]/10",
    hover: "hover:bg-[#F59E0B]/20",
  },
]

export default function ContactoPage() {
  return (
    <div>
      <div className="bg-gradient-to-r from-[#F59E0B]/10 via-transparent to-[#8B5CF6]/10 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-20 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-heading mb-4">
            Contacto
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto">
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
                className={`flex flex-col items-center gap-4 p-8 bg-white/5 border border-white/10 rounded-2xl ${item.hover} transition-all duration-300 group hover:scale-[1.02]`}
              >
                <div className={`p-4 rounded-xl ${item.bg} group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-8 h-8 ${item.color}`} />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-white font-heading">{item.label}</p>
                  <p className="text-sm text-zinc-400 mt-1">{item.value}</p>
                </div>
                <span className={`text-sm font-medium ${item.color}`}>
                  {item.action} →
                </span>
              </a>
            )
          })}
        </div>

        <div className="max-w-lg mx-auto bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-6 h-6 text-[#F59E0B]" />
          </div>
          <h3 className="text-lg font-semibold text-white font-heading mb-2">Ubicación</h3>
          <p className="text-zinc-400">
            Punta del Este, Uruguay
          </p>
          <p className="text-zinc-500 text-sm mt-2">
            Operamos desde Punta del Este con envíos a todo el país
          </p>
        </div>
      </div>
    </div>
  )
}
