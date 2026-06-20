import type { Metadata } from "next"
import Link from "next/link"
import { Package, ShoppingBag, MessageCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "ImportExpress - Productos importados desde Punta del Este",
  description: "Todo lo que necesitás, importado para vos. Electrónica, bicicletas, celulares y más.",
  openGraph: {
    title: "ImportExpress - Productos importados desde Punta del Este",
    description: "Todo lo que necesitás, importado para vos. Electrónica, bicicletas, celulares y más.",
  },
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col">
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
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-full shadow-lg shadow-[#22C55E]/30 hover:shadow-[#22C55E]/50 transition-all duration-300 hover:scale-110"
      aria-label="WhatsApp"
    >
      <MessageCircle className="w-7 h-7" />
    </a>
  )
}

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-[#0F172A]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B] flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-semibold text-white text-lg">ImportExpress</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/productos" className="text-sm text-zinc-300 hover:text-white transition-colors">
              Productos
            </Link>
            <Link href="/como-funciona" className="text-sm text-zinc-300 hover:text-white transition-colors">
              Cómo funciona
            </Link>
            <Link href="/contacto" className="text-sm text-zinc-300 hover:text-white transition-colors">
              Contacto
            </Link>
          </div>

          <a
            href="https://wa.me/5491123456789"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </nav>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#0F172A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#F59E0B] flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <span className="font-heading font-semibold text-white">ImportExpress</span>
            </div>
            <p className="text-sm text-zinc-400">
              Importamos directo desde Punta del Este. Todo lo que necesitás, al mejor precio.
            </p>
          </div>

          <div>
            <h3 className="font-heading font-semibold text-white mb-4">Navegación</h3>
            <div className="space-y-2">
              <Link href="/productos" className="block text-sm text-zinc-400 hover:text-white transition-colors">
                Productos
              </Link>
              <Link href="/como-funciona" className="block text-sm text-zinc-400 hover:text-white transition-colors">
                Cómo funciona
              </Link>
              <Link href="/contacto" className="block text-sm text-zinc-400 hover:text-white transition-colors">
                Contacto
              </Link>
            </div>
          </div>

          <div>
            <h3 className="font-heading font-semibold text-white mb-4">Contacto</h3>
            <div className="space-y-2 text-sm text-zinc-400">
              <p>WhatsApp: +54 9 11 2345-6789</p>
              <p>Instagram: @importexpress</p>
              <p>Punta del Este, Uruguay</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 mt-8 pt-8 text-center">
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} ImportExpress. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
