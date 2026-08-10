"use client"

import { useEffect, useState } from "react"

export interface WhatsAppAgent {
  id: string
  name: string
  number: string
  displayNumber: string
}

export interface UseWhatsAppConfig {
  agents: WhatsAppAgent[]
  defaultAgent: WhatsAppAgent | null
  loading: boolean
  error: boolean
}

interface PublicConfig {
  whatsapp_david?: string
  whatsapp_david_name?: string
  whatsapp_brian?: string
  whatsapp_brian_name?: string
}

// Formatea un número guardado como 5493813360558 → "+54 9 381 336-0558".
// Robusto: tolera espacios, +, -, () y números sin prefijo 549.
export function formatWhatsAppDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (!digits) return ""

  let national = digits
  let prefix = "+54 9 "

  if (national.startsWith("549")) {
    national = national.slice(3)
  } else if (national.startsWith("54")) {
    national = national.slice(2)
    prefix = "+54 "
  }

  // Móvil argentino: código de área (3) + número (7) → "381 336-0558"
  if (national.length === 10) {
    return `${prefix}${national.slice(0, 3)} ${national.slice(3, 6)}-${national.slice(6, 10)}`
  }
  // Fijo argentino: código de área (3-4) + número (6-7) → "381 456-7890"
  if (national.length === 9) {
    return `${prefix}${national.slice(0, 3)} ${national.slice(3, 6)}-${national.slice(6, 9)}`
  }
  if (national.length === 8) {
    return `${prefix}${national.slice(0, 4)}-${national.slice(4, 8)}`
  }
  // Fallback: agrupar de a 3 desde la izquierda
  const groups = national.match(/.{1,3}/g) || []
  return `${prefix}${groups.join(" ")}`
}

export function useWhatsAppConfig(): UseWhatsAppConfig {
  const [config, setConfig] = useState<PublicConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/configuracion/public")
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar configuración")
        return r.json()
      })
      .then((data: PublicConfig) => {
        if (!cancelled) setConfig(data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const agents: WhatsAppAgent[] = []
  if (config?.whatsapp_david) {
    agents.push({
      id: "david",
      name: config.whatsapp_david_name || "David Adbes",
      number: config.whatsapp_david,
      displayNumber: formatWhatsAppDisplay(config.whatsapp_david),
    })
  }
  if (config?.whatsapp_brian) {
    agents.push({
      id: "brian",
      name: config.whatsapp_brian_name || "Brian Carrizo",
      number: config.whatsapp_brian,
      displayNumber: formatWhatsAppDisplay(config.whatsapp_brian),
    })
  }

  return {
    agents,
    defaultAgent: agents[0] ?? null,
    loading,
    error,
  }
}