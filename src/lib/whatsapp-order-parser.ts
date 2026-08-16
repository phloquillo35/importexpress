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

const FIELD_STOP =
  "Nombre|Teléfono|Dirección|Email|Total|Productos?|Gracias|¡Gracias"

function extractSlug(url: string): string | undefined {
  const slugMatch = url.match(/\/productos\/([a-z0-9\-_%]+)/i)
  return slugMatch ? decodeURIComponent(slugMatch[1]) : undefined
}

export function parseWhatsAppOrder(text: string): ParsedOrder {
  const normalized = text.replace(/\*\*/g, "").replace(/\*/g, "")

  const field = (label: string): string => {
    const re = new RegExp(
      `(?:^|\\s)${label}\\s*:\\s*(.*?)(?=\\s*(?:${FIELD_STOP})|$)`,
      "i"
    )
    const match = normalized.match(re)
    return cleanLabel(match?.[1])
  }

  const clientName = field("Nombre")
  const clientPhone = field("Teléfono")
  const clientEmail = field("Email")
  const address = field("Dirección")
  const { clientName: name, clientSurname: surname } = splitClientName(clientName)

  const items: ParsedOrderItem[] = []
  const itemRe =
    /(\d+)[.)]\s+(.+?)\s+-\s+\$[\d.,]+\s*ARS(?:\s*x\s*(\d+))?/gi
  let itemMatch: RegExpExecArray | null
  while ((itemMatch = itemRe.exec(normalized))) {
    items.push({
      name: itemMatch[2].trim(),
      quantity: itemMatch[3] ? parseInt(itemMatch[3], 10) : 1,
    })
  }

  const slugs: string[] = []
  const urlRe = /https?:\/\/[^\s>)]+|\/productos\/[a-z0-9\-_%]+/gi
  let urlMatch: RegExpExecArray | null
  while ((urlMatch = urlRe.exec(normalized))) {
    const slug = extractSlug(urlMatch[0])
    if (slug) slugs.push(slug)
  }
  items.forEach((item, i) => {
    if (slugs[i]) item.slug = slugs[i]
  })

  return {
    clientName: name,
    clientSurname: surname,
    clientPhone,
    clientEmail,
    address,
    items,
  }
}
