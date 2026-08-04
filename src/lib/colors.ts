export const colorSwatch: Record<string, string> = {
  negro: "#1d1d1f", blanco: "#f5f5f7", rojo: "#ff3b30", azul: "#0071e3",
  verde: "#34c759", amarillo: "#ffcc00", gris: "#8e8e93", plateado: "#c0c0c0",
  dorado: "#ffd700", rosa: "#ffc0cb", violeta: "#af52de", marrón: "#a2845e",
  naranja: "#ff9500",
}

// Variantes de color → nombre canónico en español
const colorCanonical: Record<string, string> = {
  negro: "negro", black: "negro",
  "space black": "negro", spaceblack: "negro", spacegray: "negro", "space grey": "gris",
  blanco: "blanco", white: "blanco",
  rojo: "rojo", red: "rojo", "product red": "rojo", crimson: "rojo",
  azul: "azul", blue: "azul", midnight: "azul", "midnight blue": "azul", "sierra blue": "azul",
  cyan: "azul", "deep blue": "azul",
  verde: "verde", green: "verde", mint: "verde",
  amarillo: "amarillo", yellow: "amarillo",
  gris: "gris", gray: "gris", grey: "gris", "space gray": "gris", graphite: "gris",
  starlight: "gris", "silver grey": "gris",
  plateado: "plateado", silver: "plateado", plata: "plateado", titanium: "plateado",
  dorado: "dorado", gold: "dorado",
  rosa: "rosa", pink: "rosa",
  violeta: "violeta", purple: "violeta", "deep purple": "violeta",
  marrón: "marrón", marron: "marrón", brown: "marrón", cafe: "marrón", café: "marrón",
  naranja: "naranja", orange: "naranja",
}

// Colores que aparecen como parte de un nombre más largo (ej. "iphone 17 black titanium")
const embeddedWords: { match: string; canonical: string }[] = [
  { match: "black", canonical: "negro" },
  { match: "white", canonical: "blanco" },
  { match: "red", canonical: "rojo" },
  { match: "blue", canonical: "azul" },
  { match: "green", canonical: "verde" },
  { match: "yellow", canonical: "amarillo" },
  { match: "gray", canonical: "gris" },
  { match: "grey", canonical: "gris" },
  { match: "silver", canonical: "plateado" },
  { match: "gold", canonical: "dorado" },
  { match: "pink", canonical: "rosa" },
  { match: "purple", canonical: "violeta" },
  { match: "brown", canonical: "marrón" },
  { match: "orange", canonical: "naranja" },
]

export function normalizeColor(colorName: string): string {
  const raw = colorName.toLowerCase().trim()
  if (colorCanonical[raw]) return colorCanonical[raw]
  for (const entry of embeddedWords) {
    if (raw.includes(entry.match)) return entry.canonical
  }
  return raw
}

export function resolveColor(colorName: string): { hexes: string[]; isCombined: boolean } {
  const parts = colorName.toLowerCase().split(/\s+y\s+/)
  if (parts.length <= 1) {
    return { hexes: [colorSwatch[normalizeColor(parts[0])] || "#c0c0c0"], isCombined: false }
  }
  const hexes = parts.map(p => colorSwatch[normalizeColor(p.trim())]).filter(Boolean) as string[]
  return { hexes: hexes.length > 0 ? hexes : ["#c0c0c0"], isCombined: true }
}

export function swatchStyle(colorName: string): React.CSSProperties {
  const { hexes, isCombined } = resolveColor(colorName)
  if (!isCombined) {
    return { backgroundColor: hexes[0] }
  }
  if (hexes.length === 2) {
    return { background: `linear-gradient(135deg, ${hexes[0]} 50%, ${hexes[1]} 50%)` }
  }
  const segments = hexes.map((h, i) => `${h} ${(i / hexes.length) * 100}% ${((i + 1) / hexes.length) * 100}%`).join(", ")
  return { background: `conic-gradient(${segments})` }
}