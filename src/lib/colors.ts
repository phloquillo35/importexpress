export const colorSwatch: Record<string, string> = {
  negro: "#1d1d1f", blanco: "#f5f5f7", rojo: "#ff3b30", azul: "#0071e3",
  verde: "#34c759", amarillo: "#ffcc00", gris: "#8e8e93", plateado: "#c0c0c0",
  dorado: "#ffd700", rosa: "#ffc0cb", violeta: "#af52de", marrón: "#a2845e",
  naranja: "#ff9500",
}

export function resolveColor(colorName: string): { hexes: string[]; isCombined: boolean } {
  const parts = colorName.toLowerCase().split(/\s+y\s+/)
  if (parts.length <= 1) {
    return { hexes: [colorSwatch[parts[0]] || "#c0c0c0"], isCombined: false }
  }
  const hexes = parts.map(p => colorSwatch[p.trim()]).filter(Boolean) as string[]
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
