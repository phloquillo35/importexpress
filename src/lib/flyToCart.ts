export function flyToCart(sourceElement: HTMLElement, container?: HTMLElement | null) {
  if (typeof window === "undefined") return
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

  const candidates = document.querySelectorAll<HTMLButtonElement>(
    'button[aria-label="Carrito"], button[aria-label^="Carrito "]'
  )
  const target = Array.from(candidates).find(el => {
    const style = window.getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0
  }) ?? null
  if (!target) return

  const card = container ?? sourceElement.closest(".group") ?? sourceElement.closest('div[class*="grid"]') ?? sourceElement
  const cardRect = card.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()

  const clone = card.cloneNode(true) as HTMLElement
  clone.style.position = "fixed"
  clone.style.left = `${cardRect.left}px`
  clone.style.top = `${cardRect.top}px`
  clone.style.width = `${cardRect.width}px`
  clone.style.height = `${cardRect.height}px`
  clone.style.zIndex = "9999"
  clone.style.pointerEvents = "none"
  clone.style.borderRadius = "16px"
  clone.style.overflow = "hidden"
  clone.style.boxShadow = "0 12px 40px rgba(0,0,0,0.25)"
  clone.style.transformOrigin = "center center"
  clone.style.willChange = "transform, opacity"
  clone.style.margin = "0"

  clone.querySelectorAll("button, a, [onclick]").forEach(el => {
    const node = el as HTMLElement
    node.removeAttribute("onclick")
    node.style.pointerEvents = "none"
  })

  document.body.appendChild(clone)

  const dx = targetRect.left + targetRect.width / 2 - (cardRect.left + cardRect.width / 2)
  const dy = targetRect.top + targetRect.height / 2 - (cardRect.top + cardRect.height / 2)

  clone.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1, offset: 0 },
      { transform: `translate(${dx * 0.2}px, ${dy * 0.2}px) scale(0.9)`, opacity: 1, offset: 0.15 },
      { transform: `translate(${dx * 0.7}px, ${dy * 0.7}px) scale(0.4)`, opacity: 0.8, offset: 0.7 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0, offset: 1 },
    ],
    { duration: 600, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
  ).onfinish = () => clone.remove()
}