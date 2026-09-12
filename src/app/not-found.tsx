import Link from "next/link"
import { Package, ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <img src="/logo.jpg" alt="Lo Pedís, Lo Tenes" className="w-14 h-14 rounded-xl object-cover mb-6" />
      <Package className="w-16 h-16 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold text-foreground font-heading mb-2">
        Página no encontrada
      </h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        La página que buscás no existe o fue eliminada.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-full transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al inicio
      </Link>
    </div>
  )
}
