import "@testing-library/jest-dom"
import { vi, beforeAll, afterAll } from "vitest"

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, "localStorage", { value: localStorageMock })

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock window.innerWidth/innerHeight
Object.defineProperty(window, "innerWidth", { writable: true, value: 1024 })
Object.defineProperty(window, "innerHeight", { writable: true, value: 768 })

// Mock getComputedStyle
Object.defineProperty(window, "getComputedStyle", {
  writable: true,
  value: vi.fn().mockReturnValue({
    display: "block",
    visibility: "visible",
  }),
})

// Mock HTMLElement.prototype.getBoundingClientRect
HTMLElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
  left: 0,
  top: 0,
  right: 100,
  bottom: 100,
  width: 100,
  height: 100,
  x: 0,
  y: 0,
})

// Mock document.body.appendChild
document.body.appendChild = vi.fn()

// Mock Element.prototype.animate
Element.prototype.animate = vi.fn().mockReturnValue({
  onfinish: null,
  finished: Promise.resolve(),
  cancel: vi.fn(),
})

// Mock querySelectorAll for cart button
document.querySelectorAll = vi.fn().mockReturnValue([])

// Suppress console.error for known warnings in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      args[0]?.includes?.("useCart must be used within CartProvider") ||
      args[0]?.includes?.("act(...)")
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})
afterAll(() => {
  console.error = originalError
})