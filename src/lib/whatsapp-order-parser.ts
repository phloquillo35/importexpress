export interface ParsedOrderItem {
  name: string
  slug?: string
  quantity: number
}

export interface ParsedOrder {
  clientName: string
  clientSurname: string
  clientPhone: string
  clientEmail: string
  address: string
  items: ParsedOrderItem[]
}

export function splitClientName(fullName: string): { clientName: string; clientSurname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { clientName: fullName.trim(), clientSurname: "" }
  return {
    clientName: parts.slice(0, -1).join(" "),
    clientSurname: parts[parts.length - 1],
  }
}

function cleanLabel(value: string | undefined): string {
  return (value || "").trim()
}

export function parseWhatsAppOrder(text: string): ParsedOrder {
  const lines = text.split(/\r?\n/)
  const normalized = text.replace(/\*\*/g, "").replace(/\*/g, "")

  const field = (label: string): string => {
    const re = new RegExp(`^\\s*${label}\\s*:\\s*(.+)$`, "im")
    const match = normalized.match(re)
    return cleanLabel(match?.[1])
  }

  const clientName = field("Nombre")
  const clientPhone = field("Teléfono")
  const clientEmail = field("Email")
  const address = field("Dirección")
  const { clientName: name, clientSurname: surname } = splitClientName(clientName)

  const items: ParsedOrderItem[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    const slugMatch = line.match(/🔗\s*(?:https?:\/\/[^\s/]+\/)?productos\/([^\s?#]+)/i)
    if (slugMatch) {
      const lastItem = items[items.length - 1]
      if (lastItem) lastItem.slug = slugMatch[1]
      continue
    }

    const itemMatch = line.match(/^(\d+)[.)]\s+(.+?)\s+-\s+\$[\d.,]+\s*ARS(?:\s*x\s*(\d+))?/i)
    if (itemMatch) {
      items.push({
        name: itemMatch[2].trim(),
        quantity: itemMatch[3] ? parseInt(itemMatch[3], 10) : 1,
      })
    }
  }

  return {
    clientName: name,
    clientSurname: surname,
    clientPhone,
    clientEmail,
    address,
    items,
  }
}
