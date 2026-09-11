"use client"

import { useSession } from "next-auth/react"

/**
 * El rol "viewer" (ej. contador) puede ver todo el panel admin pero no
 * crear, editar ni eliminar nada — esa restricción real vive en el backend
 * (cada endpoint de escritura exige role "admin"); este hook solo controla
 * si se muestran/habilitan los controles de edición en la UI.
 */
export function useCanEdit() {
  const { data: session } = useSession()
  return session?.user?.role === "admin"
}
