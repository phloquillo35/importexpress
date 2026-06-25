import type { Metadata } from "next"
import Link from "next/link"
import { Package, MessageCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "Lo Pedís, Lo Tenes - Importación directa desde Punta del Este",
  description: "Importamos desde Punta del Este directo a tu casa. Electrónica, bicicletas, celulares y más.",
  openGraph: {
    title: "Lo Pedís, Lo Tenes - Importación directa desde Punta del Este",
    description: "Todo lo que necesitás, importado para vos. Electrónica, bicicletas, celulares y más.",
  },
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed inset-0 -z-10">
        <div className="relative w-full h-full">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover object-center"
          >
            <source src="/videos/hero.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60" />
        </div>
      </div>
      <Navbar />
      <main className="flex-1">{children}</main>
      <FloatingWhatsApp />
      <Footer />
    </div>
  )
}

function FloatingWhatsApp() {
  return (
    <a
      href="https://wa.me/5491123456789"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#34c759] hover:bg-[#28a745] text-white rounded-full shadow-lg shadow-[#34c759]/30 hover:shadow-[#34c759]/50 transition-all duration-300 hover:scale-110"
      aria-label="WhatsApp"
    >
      <MessageCircle className="w-7 h-7" />
    </a>
  )
}

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-[#d2d2d7]/50 rounded-b-2xl">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between h-12 lg:h-14">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img src="/logo.jpg" alt="Lo Pedís, Lo Tenes" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-heading font-semibold text-[#1d1d1f] text-sm">Lo Pedís, Lo Tenes</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/productos" className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors font-medium">
              Productos
            </Link>
            <Link href="/como-funciona" className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors font-medium">
              Cómo funciona
            </Link>
            <Link href="/contacto" className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors font-medium">
              Contacto
            </Link>
          </div>

          <a
            href="https://wa.me/5491123456789"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-medium rounded-full transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </nav>
  )
}

function Footer() {
  return (
    <footer className="bg-[#f5f5f7] border-t border-[#d2d2d7]/50 rounded-t-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo.jpg" alt="Lo Pedís, Lo Tenes" className="w-6 h-6 rounded-md object-cover" />
              <span className="font-heading font-semibold text-[#1d1d1f] text-sm">Lo Pedís, Lo Tenes</span>
            </div>
            <p className="text-xs text-[#6e6e73] leading-relaxed">
              Importamos desde Punta del Este directo a tu casa. Todo lo que necesitás, al mejor precio.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-[#1d1d1f] uppercase tracking-wider mb-4">Navegación</h3>
            <div className="space-y-2.5">
              <Link href="/productos" className="block text-xs text-[#6e6e73] hover:text-[#0071e3] transition-colors">
                Productos
              </Link>
              <Link href="/como-funciona" className="block text-xs text-[#6e6e73] hover:text-[#0071e3] transition-colors">
                Cómo funciona
              </Link>
              <Link href="/contacto" className="block text-xs text-[#6e6e73] hover:text-[#0071e3] transition-colors">
                Contacto
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-[#1d1d1f] uppercase tracking-wider mb-4">Contacto</h3>
            <div className="space-y-2.5 text-xs text-[#6e6e73]">
              <p>WhatsApp: +54 9 11 2345-6789</p>
              <p>Instagram: @lopedis_lotenes.01</p>
              <p>Tucumán, Argentina</p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#d2d2d7]/50 mt-8 pt-6 text-center">
          <p className="text-xs text-[#6e6e73]">
            © {new Date().getFullYear()} Lo Pedís, Lo Tenes. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
