const GRANDE_KEYWORDS = [
  "tv", "televisor", "smart tv", "microondas", "heladera", "refrigerador",
  "lavarropas", "lavadora", "lavavajillas", "lavavajilla", "aire acondicionado",
  "freezer", "cocina", "horno", "anafe", "termotanque", "secarropas",
  "ventilador de pie", "bicicleta", "monitor", "impresora",
]

export function detectBulkSize(name: string, categoryName?: string): "chico" | "grande" {
  const haystack = `${name || ""} ${categoryName || ""}`.toLowerCase()
  for (const kw of GRANDE_KEYWORDS) {
    if (haystack.includes(kw)) return "grande"
  }
  return "chico"
}
