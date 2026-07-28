"use client"

import { useEffect } from "react"
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
      <AlertCircle className="w-16 h-16 text-[#ff3b30] mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-foreground font-heading mb-2">
        Algo salió mal
      </h1>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Ocurrió un error inesperado. Puede ser un problema de conexión o de la aplicación.
      </p>
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-full transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Intentar de nuevo
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-muted hover:bg-[#e8e8ed] text-foreground text-sm font-medium rounded-full transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
