import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { Navbar } from "@/components/public/Navbar"
import { HeroBackground } from "@/components/public/HeroBackground"
import { CartProvider } from "@/context/CartContext"
import { getCategories } from "@/lib/categories"

export const metadata: Metadata = {
  title: "Lo Pedís, Lo Tenes - Importación directa desde Ciudad del Este, Paraguay",
  description: "Importamos desde Ciudad del Este, Paraguay directo a tu casa. Electrónica, bicicletas, celulares y más.",
  openGraph: {
    title: "Lo Pedís, Lo Tenes - Importación directa desde Ciudad del Este, Paraguay",
    description: "Todo lo que necesitás, importado para vos. Electrónica, bicicletas, celulares y más.",
    images: [{ url: "/images/og-whatsapp.jpg", width: 1200, height: 630, alt: "Lo Pedís, Lo Tenes" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lo Pedís, Lo Tenes",
    description: "Importación directa desde Ciudad del Este, Paraguay",
    images: ["/images/og-whatsapp.jpg"],
  },
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategories().catch(() => [])
  return (
    <CartProvider>
    <div className="min-h-screen flex flex-col">
      <HeroBackground />
      <Navbar initialCategories={categories} />
      <main className="flex-1"><Suspense fallback={null}>{children}</Suspense></main>
      <Footer />
    </div>
    </CartProvider>
  )
}

function Footer() {
  return (
    <footer className="bg-secondary border-t border-border/50 rounded-t-2xl overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo.jpg" alt="Lo Pedís, Lo Tenes" className="w-6 h-6 rounded-md object-cover" />
              <span className="font-heading font-semibold text-secondary-foreground text-sm">Lo Pedís, Lo Tenes</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Importamos desde Ciudad del Este, Paraguay directo a tu casa. Todo lo que necesitás, al mejor precio.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-secondary-foreground uppercase tracking-wider mb-4">Navegación</h3>
            <div className="space-y-2.5">
              <Link href="/productos" className="block text-xs text-muted-foreground hover:text-primary transition-colors">
                Productos
              </Link>
              <Link href="/como-funciona" className="block text-xs text-muted-foreground hover:text-primary transition-colors">
                Cómo funciona
              </Link>
              <Link href="/contacto" className="block text-xs text-muted-foreground hover:text-primary transition-colors">
                Contacto
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-secondary-foreground uppercase tracking-wider mb-4">Contacto</h3>
            <div className="space-y-2.5 text-xs text-muted-foreground">
              <Link
                href="https://wa.me/5493813360558"
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:text-primary transition-colors"
              >
                WhatsApp: David — +54 9 381 336-0558
              </Link>
              <Link
                href="https://wa.me/5493816658420"
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:text-primary transition-colors"
              >
                WhatsApp: Brian — +54 9 381 665-8420
              </Link>
              <p>Instagram: @lopedis_lotenes.01</p>
              <p>Tucumán, Argentina</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50 mt-8 pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Lo Pedís, Lo Tenes. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
