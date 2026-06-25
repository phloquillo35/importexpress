import type { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/public/Navbar"
import { CartProvider } from "@/context/CartContext"

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
    <CartProvider>
    <div className="min-h-screen flex flex-col">
      <div className="fixed inset-0 -z-10">
        <div className="relative w-full h-full bg-[#1d1d1f]">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            className="absolute inset-0 w-full h-full object-cover object-center hidden md:block"
          >
            <source src="/videos/hero.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60" />
        </div>
      </div>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
    </CartProvider>
  )
}

function Footer() {
  return (
    <footer className="bg-[#f5f5f7] border-t border-[#d2d2d7]/50 rounded-t-2xl overflow-hidden">
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
