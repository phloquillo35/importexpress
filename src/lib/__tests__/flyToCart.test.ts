import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { flyToCart } from "@/lib/flyToCart"

describe("flyToCart", () => {
  let mockTargetButton: HTMLButtonElement
  let mockSourceElement: HTMLElement
  let mockContainer: HTMLElement
  let mockClone: HTMLElement
  let originalInnerWidth: number
  let originalInnerHeight: number

  beforeEach(() => {
    vi.clearAllMocks()

    originalInnerWidth = window.innerWidth
    originalInnerHeight = window.innerHeight

    // Mock window dimensions
    Object.defineProperty(window, "innerWidth", { writable: true, value: 1024 })
    Object.defineProperty(window, "innerHeight", { writable: true, value: 768 })

    // Mock matchMedia for reduced motion
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === "(prefers-reduced-motion: reduce)" ? false : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    // Create mock target button (cart button)
    mockTargetButton = document.createElement("button")
    mockTargetButton.setAttribute("aria-label", "Carrito")
    mockTargetButton.style.display = "block"
    mockTargetButton.style.visibility = "visible"
    document.body.appendChild(mockTargetButton)

    // Mock getBoundingClientRect for target
    mockTargetButton.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 900,
      top: 700,
      right: 956,
      bottom: 756,
      width: 56,
      height: 56,
      x: 900,
      y: 700,
    })

    // Create mock source element (product card)
    mockSourceElement = document.createElement("div")
    mockSourceElement.className = "group"
    mockSourceElement.innerHTML = '<div class="product-content">Product</div>'
    document.body.appendChild(mockSourceElement)

    mockSourceElement.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 100,
      top: 200,
      right: 300,
      bottom: 400,
      width: 200,
      height: 200,
      x: 100,
      y: 200,
    })

    // Create mock container
    mockContainer = document.createElement("div")
    mockContainer.className = "grid"
    document.body.appendChild(mockContainer)

    mockContainer.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 100,
      top: 200,
      right: 300,
      bottom: 400,
      width: 200,
      height: 200,
      x: 100,
      y: 200,
    })

    // Mock cloneNode
    mockClone = document.createElement("div")
    mockClone.querySelectorAll = vi.fn().mockReturnValue([])
    mockClone.remove = vi.fn()
    mockSourceElement.cloneNode = vi.fn().mockReturnValue(mockClone)
    mockContainer.cloneNode = vi.fn().mockReturnValue(mockClone)

    // Mock document.body.appendChild
    document.body.appendChild = vi.fn()

    // Mock Element.prototype.animate
    Element.prototype.animate = vi.fn().mockReturnValue({
      onfinish: null,
      finished: Promise.resolve(),
      cancel: vi.fn(),
    })

    // Mock querySelectorAll for cart button
    document.querySelectorAll = vi.fn().mockReturnValue([mockTargetButton])
  })

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", { writable: true, value: originalInnerWidth })
    Object.defineProperty(window, "innerHeight", { writable: true, value: originalInnerHeight })
    vi.restoreAllMocks()
    document.body.innerHTML = ""
  })

  it("should return early if prefers-reduced-motion is set", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === "(prefers-reduced-motion: reduce)" ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    flyToCart(mockSourceElement)
    expect(document.body.appendChild).not.toHaveBeenCalled()
  })

  it("should find cart button by aria-label on desktop", () => {
    flyToCart(mockSourceElement)

    expect(document.querySelectorAll).toHaveBeenCalledWith(
      'button[aria-label="Carrito"], button[aria-label^="Carrito "]'
    )
    expect(document.body.appendChild).toHaveBeenCalled()
  })

  it("should use virtual FAB rect on mobile when no cart button found", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, value: 375 })
    Object.defineProperty(window, "innerHeight", { writable: true, value: 667 })

    document.querySelectorAll = vi.fn().mockReturnValue([])

    flyToCart(mockSourceElement)

    expect(document.body.appendChild).toHaveBeenCalled()
    const clone = (document.body.appendChild as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(clone.style.position).toBe("fixed")
    expect(clone.style.zIndex).toBe("9999")
  })

  it("should return early on desktop if no cart button found", () => {
    document.querySelectorAll = vi.fn().mockReturnValue([])

    flyToCart(mockSourceElement)

    expect(document.body.appendChild).not.toHaveBeenCalled()
  })

  it("should use container element when provided", () => {
    flyToCart(mockSourceElement, mockContainer)

    expect(mockContainer.cloneNode).toHaveBeenCalledWith(true)
  })

  it("should fall back to sourceElement.closest('.group') when no container", () => {
    mockSourceElement.closest = vi.fn().mockReturnValue(mockSourceElement)

    flyToCart(mockSourceElement)

    expect(mockSourceElement.closest).toHaveBeenCalledWith(".group")
  })

  it("should clone the card element", () => {
    flyToCart(mockSourceElement)

    expect(mockSourceElement.cloneNode).toHaveBeenCalledWith(true)
  })

  it("should set clone styles correctly", () => {
    flyToCart(mockSourceElement)

    const clone = (document.body.appendChild as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(clone.style.position).toBe("fixed")
    expect(clone.style.zIndex).toBe("9999")
    expect(clone.style.pointerEvents).toBe("none")
    expect(clone.style.borderRadius).toBe("16px")
    expect(clone.style.overflow).toBe("hidden")
    expect(clone.style.willChange).toBe("transform, opacity")
    expect(clone.style.margin).toBe("0px")
  })

  it("should remove interactive elements from clone", () => {
    const mockButton = document.createElement("button")
    mockButton.setAttribute("onclick", "test()")
    mockClone.querySelectorAll = vi.fn().mockReturnValue([mockButton])

    flyToCart(mockSourceElement)

    expect(mockButton.hasAttribute("onclick")).toBe(false)
    expect(mockButton.style.pointerEvents).toBe("none")
  })

  it("should calculate animation transform correctly", () => {
    flyToCart(mockSourceElement)

    expect(Element.prototype.animate).toHaveBeenCalled()
    const animateCall = (Element.prototype.animate as ReturnType<typeof vi.fn>).mock.calls[0]
    const keyframes = animateCall[0]
    const options = animateCall[1]

    expect(options.duration).toBe(600)
    expect(options.easing).toBe("cubic-bezier(0.4, 0, 0.2, 1)")

    // Check keyframes structure
    expect(keyframes).toHaveLength(4)
    expect(keyframes[0].transform).toBe("translate(0,0) scale(1)")
    expect(keyframes[0].opacity).toBe(1)
    expect(keyframes[3].opacity).toBe(0)
  })

  it("should remove clone on animation finish", () => {
    const mockAnimation = {
      onfinish: null as (() => void) | null,
      finished: Promise.resolve(),
      cancel: vi.fn(),
    }
    Element.prototype.animate = vi.fn().mockReturnValue(mockAnimation)

    flyToCart(mockSourceElement)

    expect(mockAnimation.onfinish).toBeDefined()
    mockAnimation.onfinish!()
    expect(mockClone.remove).toHaveBeenCalled()
  })

  it("should handle mobile viewport with safe area", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, value: 375 })
    Object.defineProperty(window, "innerHeight", { writable: true, value: 667 })

    document.querySelectorAll = vi.fn().mockReturnValue([])

    flyToCart(mockSourceElement)

    const clone = (document.body.appendChild as ReturnType<typeof vi.fn>).mock.calls[0][0]
    // On mobile, it should use virtual FAB position
    expect(clone.style.left).toBeDefined()
    expect(clone.style.top).toBeDefined()
  })

  it("should handle aria-label with suffix (e.g., 'Carrito (3)')", () => {
    const mockButtonWithCount = document.createElement("button")
    mockButtonWithCount.setAttribute("aria-label", "Carrito (3)")
    mockButtonWithCount.style.display = "block"
    mockButtonWithCount.style.visibility = "visible"
    mockButtonWithCount.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 900,
      top: 700,
      right: 956,
      bottom: 756,
      width: 56,
      height: 56,
      x: 900,
      y: 700,
    })
    document.querySelectorAll = vi.fn().mockReturnValue([mockButtonWithCount])

    flyToCart(mockSourceElement)

    expect(document.body.appendChild).toHaveBeenCalled()
  })
})