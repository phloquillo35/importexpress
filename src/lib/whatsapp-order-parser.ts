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

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function normalizeSlug(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, "").toLowerCase()
}

function extractSlug(line: string): string | undefined {
  const urlMatch = line.match(/https?:\/\/[^\s>)]+|[^\s]*\/productos\/[^\s>)]+/i)
  if (!urlMatch) return undefined
  const url = urlMatch[0]
  const slugMatch = url.match(/\/productos\/([a-z0-9\-_%]+)/i)
  return slugMatch ? decodeURIComponent(slugMatch[1]) : undefined
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
  let pendingSlug: string | undefined

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    const slugFromLine = extractSlug(line)
    if (slugFromLine) {
      const lastItem = items[items.length - 1]
      if (lastItem && !lastItem.slug) {
        lastItem.slug = slugFromLine
      } else {
        pendingSlug = slugFromLine
      }
      continue
    }

    const itemMatch = line.match(/^(\d+)[.)]\s+(.+?)\s+-\s+\$[\d.,]+\s*ARS(?:\s*x\s*(\d+))?/i)
    if (itemMatch) {
      items.push({
        name: itemMatch[2].trim(),
        slug: pendingSlug,
        quantity: itemMatch[3] ? parseInt(itemMatch[3], 10) : 1,
      })
      pendingSlug = undefined
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
