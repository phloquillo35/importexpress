import "@testing-library/jest-dom"
import { vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest"

// ============================================
// GLOBAL MOCKS - Available in all test files
// ============================================

// Mock localStorage globally
const localStorageStore: Record<string, string> = {}

const createLocalStorageMock = () => ({
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key] }),
  clear: vi.fn(() => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]) }),
  key: vi.fn((index: number) => Object.keys(localStorageStore)[index] ?? null),
  get length() { return Object.keys(localStorageStore).length },
})

const localStorageMock = createLocalStorageMock()
Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true })
Object.defineProperty(global, "localStorage", { value: localStorageMock, writable: true })

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

// Mock Element.prototype.animate
Element.prototype.animate = vi.fn().mockReturnValue({
  onfinish: null,
  finished: Promise.resolve(),
  cancel: vi.fn(),
})

// Mock scroll lock functions
vi.mock("@/lib/utils", () => ({
  lockScroll: vi.fn(),
  unlockScroll: vi.fn(),
  cn: vi.fn((...args: unknown[]) => args.join(" ")),
  genId: vi.fn(() => "test-id"),
  formatUSD: vi.fn((price: number) => `$${price} USD`),
  formatARS: vi.fn((price: number) => `$${price.toLocaleString("es-AR")} ARS`),
  formatDate: vi.fn((date: Date | string) => new Date(date).toLocaleDateString()),
  formatNumber: vi.fn((num: number) => num.toLocaleString()),
  slugify: vi.fn((text: string) => text.toLowerCase().replace(/\s+/g, "-")),
  truncate: vi.fn((text: string, length: number) => text.length > length ? text.slice(0, length) + "..." : text),
}))

// Mock exchange-rate
vi.mock("@/lib/exchange-rate", () => ({
  fetchExchangeRate: vi.fn().mockResolvedValue(1000),
}))

// Mock WhatsAppAgentSelector
vi.mock("@/components/public/WhatsAppAgentSelector", () => ({
  WhatsAppAgentSelector: () => null,
}))

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

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
  // Clear localStorage store
  Object.keys(localStorageStore).forEach(k => delete localStorageStore[k])
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})