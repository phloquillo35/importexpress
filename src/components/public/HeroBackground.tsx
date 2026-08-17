"use client"

import { useTheme } from "next-themes"
import { useMemo } from "react"

const NOISE_SVG_LIGHT = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/feTurbulence%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
const NOISE_SVG_DARK = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/feTurbulence%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`

export function HeroBackground() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const backgroundStyle = useMemo(() => {
    if (isDark) {
      return {
        background: `
          linear-gradient(135deg, #000000 0%, #0a0a0b 50%, #121212 100%),
          ${NOISE_SVG_DARK}
        `,
        backgroundSize: "100% 100%, 256px 256px",
        opacity: 1,
      } as React.CSSProperties
    }
    return {
      background: `
        linear-gradient(135deg, #fafafa 0%, #f5f5f7 50%, #eeeeee 100%),
        ${NOISE_SVG_LIGHT}
      `,
      backgroundSize: "100% 100%, 256px 256px",
      opacity: 1,
    } as React.CSSProperties
  }, [isDark])

  const overlayStyle = useMemo(() => ({
    background: isDark
      ? "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.3) 100%)"
      : "linear-gradient(to bottom, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.3) 100%)",
  } as React.CSSProperties), [isDark])

  return (
    <div className="fixed inset-0 -z-10" style={backgroundStyle}>
      <div className="absolute inset-0" style={overlayStyle} />
    </div>
  )
}
