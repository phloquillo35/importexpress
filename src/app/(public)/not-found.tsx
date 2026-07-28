import Link from "next/link"
import { Package, ArrowLeft } from "lucide-react"

export default function PublicNotFound() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
      <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-foreground font-heading mb-2">
        Página no encontrada
      </h1>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
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
