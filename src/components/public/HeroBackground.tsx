"use client"

import { useTheme } from "next-themes"

export function HeroBackground() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <div className="fixed inset-0 -z-10">
      <div className="relative w-full h-full">
        <img
          src={isDark ? "/images/hero-dark.webp" : "/images/hero-light.webp"}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div
          className={`absolute inset-0 ${
            isDark
              ? "bg-gradient-to-b from-black/60 via-black/50 to-black/60"
              : "bg-gradient-to-b from-white/80 via-white/70 to-white/80"
          }`}
        />
      </div>
    </div>
  )
}
