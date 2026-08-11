import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { CartProvider, useCart } from "@/context/CartContext"
import type { CartItem } from "@/context/CartContext"

const STORAGE_KEY = "lopedis_cart"

// Create a proper localStorage mock
const createLocalStorageMock = () => {
  const store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
  }
}

describe("CartContext", () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock = createLocalStorageMock()
    Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderWithProvider = (children: React.ReactNode) => {
    return render(<CartProvider>{children}</CartProvider>)
  }

  const TestComponent = () => {
    const cart = useCart()
    return (
      <div>
        <span data-testid="count">{cart.count}</span>
        <span data-testid="total">{cart.total}</span>
        <span data-testid="items">{JSON.stringify(cart.items)}</span>
        <button onClick={() => cart.addItem({ slug: "test", color: null, name: "Test", price: 100, image: null })}>Add</button>
        <button onClick={() => cart.removeItem("test")}>Remove</button>
        <button onClick={() => cart.updateQuantity("test", 5)}>Update</button>
        <button onClick={() => cart.clearCart()}>Clear</button>
      </div>
    )
  }

  describe("Initial state", () => {
    it("should initialize with empty cart", () => {
      renderWithProvider(<TestComponent />)
      expect(screen.getByTestId("count").textContent).toBe("0")
      expect(screen.getByTestId("total").textContent).toBe("0")
      expect(screen.getByTestId("items").textContent).toBe("[]")
    })

    it("should load from localStorage on init", () => {
      const storedItems: CartItem[] = [
        { slug: "prod-1", color: "red", name: "Product 1", price: 100, quantity: 2, image: "img1.jpg" },
      ]
      localStorage.getItem.mockReturnValue(JSON.stringify(storedItems))

      renderWithProvider(<TestComponent />)

      expect(screen.getByTestId("count").textContent).toBe("2")
      expect(screen.getByTestId("total").textContent).toBe("200")
    })

    it("should handle corrupted localStorage gracefully", () => {
      localStorage.getItem.mockReturnValue("invalid json")

      renderWithProvider(<TestComponent />)

      expect(screen.getByTestId("count").textContent).toBe("0")
      expect(screen.getByTestId("items").textContent).toBe("[]")
    })
  })

  describe("addItem", () => {
    it("should add new item to empty cart", () => {
      renderWithProvider(<TestComponent />)

      act(() => {
        screen.getByText("Add").click()
      })

      expect(screen.getByTestId("count").textContent).toBe("1")
      expect(screen.getByTestId("total").textContent).toBe("100")
    })

    it("should increment quantity if same item added again", () => {
      renderWithProvider(<TestComponent />)

      act(() => {
        screen.getByText("Add").click()
        screen.getByText("Add").click()
      })

      expect(screen.getByTestId("count").textContent).toBe("2")
      expect(screen.getByTestId("total").textContent).toBe("200")
    })

    it("should treat different colors as separate items", () => {
      const TestComponentWithColor = () => {
        const cart = useCart()
        return (
          <div>
            <span data-testid="count">{cart.count}</span>
            <button onClick={() => cart.addItem({ slug: "test", color: "red", name: "Test Red", price: 100, image: null })}>Add Red</button>
            <button onClick={() => cart.addItem({ slug: "test", color: "blue", name: "Test Blue", price: 200, image: null })}>Add Blue</button>
          </div>
        )
      }

      renderWithProvider(<TestComponentWithColor />)

      act(() => {
        screen.getByText("Add Red").click()
        screen.getByText("Add Blue").click()
      })

      expect(screen.getByTestId("count").textContent).toBe("2")
      expect(screen.getByTestId("total").textContent).toBe("300")
    })

    it("should persist to localStorage after add", () => {
      renderWithProvider(<TestComponent />)

      act(() => {
        screen.getByText("Add").click()
      })

      expect(localStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining("test")
      )
    })
  })

  describe("removeItem", () => {
    it("should remove item by slug", () => {
      const storedItems: CartItem[] = [
        { slug: "prod-1", color: null, name: "Product 1", price: 100, quantity: 1, image: null },
      ]
      localStorage.getItem.mockReturnValue(JSON.stringify(storedItems))

      renderWithProvider(<TestComponent />)

      act(() => {
        screen.getByText("Remove").click()
      })

      expect(screen.getByTestId("count").textContent).toBe("0")
      expect(screen.getByTestId("items").textContent).toBe("[]")
    })

    it("should remove specific color variant", () => {
      const storedItems: CartItem[] = [
        { slug: "prod-1", color: "red", name: "Product Red", price: 100, quantity: 1, image: null },
        { slug: "prod-1", color: "blue", name: "Product Blue", price: 200, quantity: 1, image: null },
      ]
      localStorage.getItem.mockReturnValue(JSON.stringify(storedItems))

      const TestComponentWithColor = () => {
        const cart = useCart()
        return (
          <div>
            <span data-testid="count">{cart.count}</span>
            <button onClick={() => cart.removeItem("prod-1", "red")}>Remove Red</button>
          </div>
        )
      }

      renderWithProvider(<TestComponentWithColor />)

      act(() => {
        screen.getByText("Remove Red").click()
      })

      expect(screen.getByTestId("count").textContent).toBe("1")
    })

    it("should persist to localStorage after remove", () => {
      const storedItems: CartItem[] = [
        { slug: "prod-1", color: null, name: "Product 1", price: 100, quantity: 1, image: null },
      ]
      localStorage.getItem.mockReturnValue(JSON.stringify(storedItems))

      renderWithProvider(<TestComponent />)

      act(() => {
        screen.getByText("Remove").click()
      })

      expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, "[]")
    })
  })

  describe("updateQuantity", () => {
    it("should update quantity to positive value", () => {
      const storedItems: CartItem[] = [
        { slug: "prod-1", color: null, name: "Product 1", price: 100, quantity: 1, image: null },
      ]
      localStorage.getItem.mockReturnValue(JSON.stringify(storedItems))

      renderWithProvider(<TestComponent />)

      act(() => {
        screen.getByText("Update").click()
      })

      expect(screen.getByTestId("count").textContent).toBe("5")
      expect(screen.getByTestId("total").textContent).toBe("500")
    })

    it("should remove item when quantity set to 0", () => {
      const storedItems: CartItem[] = [
        { slug: "prod-1", color: null, name: "Product 1", price: 100, quantity: 3, image: null },
      ]
      localStorage.getItem.mockReturnValue(JSON.stringify(storedItems))

      const TestComponentUpdate = () => {
        const cart = useCart()
        return (
          <div>
            <span data-testid="count">{cart.count}</span>
            <button onClick={() => cart.updateQuantity("prod-1", 0)}>Set Zero</button>
          </div>
        )
      }

      renderWithProvider(<TestComponentUpdate />)

      act(() => {
        screen.getByText("Set Zero").click()
      })

      expect(screen.getByTestId("count").textContent).toBe("0")
    })

    it("should remove item when quantity set to negative", () => {
      const storedItems: CartItem[] = [
        { slug: "prod-1", color: null, name: "Product 1", price: 100, quantity: 3, image: null },
      ]
      localStorage.getItem.mockReturnValue(JSON.stringify(storedItems))

      const TestComponentUpdate = () => {
        const cart = useCart()
        return (
          <div>
            <span data-testid="count">{cart.count}</span>
            <button onClick={() => cart.updateQuantity("prod-1", -1)}>Set Negative</button>
          </div>
        )
      }

      renderWithProvider(<TestComponentUpdate />)

      act(() => {
        screen.getByText("Set Negative").click()
      })

      expect(screen.getByTestId("count").textContent).toBe("0")
    })

    it("should update specific color variant", () => {
      const storedItems: CartItem[] = [
        { slug: "prod-1", color: "red", name: "Product Red", price: 100, quantity: 1, image: null },
        { slug: "prod-1", color: "blue", name: "Product Blue", price: 200, quantity: 1, image: null },
      ]
      localStorage.getItem.mockReturnValue(JSON.stringify(storedItems))

      const TestComponentWithColor = () => {
        const cart = useCart()
        return (
          <div>
            <span data-testid="count">{cart.count}</span>
            <span data-testid="total">{cart.total}</span>
            <button onClick={() => cart.updateQuantity("prod-1", 5, "red")}>Update Red</button>
          </div>
        )
      }

      renderWithProvider(<TestComponentWithColor />)

      act(() => {
        screen.getByText("Update Red").click()
      })

      expect(screen.getByTestId("count").textContent).toBe("5")
      expect(screen.getByTestId("total").textContent).toBe("700") // 5*100 + 1*200
    })

    it("should persist to localStorage after update", () => {
      const storedItems: CartItem[] = [
        { slug: "prod-1", color: null, name: "Product 1", price: 100, quantity: 1, image: null },
      ]
      localStorage.getItem.mockReturnValue(JSON.stringify(storedItems))

      renderWithProvider(<TestComponent />)

      act(() => {
        screen.getByText("Update").click()
      })

      expect(localStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining('"quantity":5')
      )
    })
  })

  describe("clearCart", () => {
    it("should remove all items", () => {
      const storedItems: CartItem[] = [
        { slug: "prod-1", color: null, name: "Product 1", price: 100, quantity: 2, image: null },
        { slug: "prod-2", color: "red", name: "Product 2 Red", price: 200, quantity: 1, image: null },
      ]
      localStorage.getItem.mockReturnValue(JSON.stringify(storedItems))

      renderWithProvider(<TestComponent />)

      act(() => {
        screen.getByText("Clear").click()
      })

      expect(screen.getByTestId("count").textContent).toBe("0")
      expect(screen.getByTestId("total").textContent).toBe("0")
      expect(screen.getByTestId("items").textContent).toBe("[]")
    })

    it("should persist empty array to localStorage", () => {
      const storedItems: CartItem[] = [
        { slug: "prod-1", color: null, name: "Product 1", price: 100, quantity: 1, image: null },
      ]
      localStorage.getItem.mockReturnValue(JSON.stringify(storedItems))

      renderWithProvider(<TestComponent />)

      act(() => {
        screen.getByText("Clear").click()
      })

      expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, "[]")
    })
  })

  describe("total and count calculations", () => {
    it("should calculate total correctly with multiple items", () => {
      const storedItems: CartItem[] = [
        { slug: "prod-1", color: null, name: "Product 1", price: 100, quantity: 2, image: null },
        { slug: "prod-2", color: "red", name: "Product 2", price: 250, quantity: 3, image: null },
      ]
      localStorage.getItem.mockReturnValue(JSON.stringify(storedItems))

      renderWithProvider(<TestComponent />)

      expect(screen.getByTestId("count").textContent).toBe("5")
      expect(screen.getByTestId("total").textContent).toBe("950") // 2*100 + 3*250
    })

    it("should handle zero price items", () => {
      const storedItems: CartItem[] = [
        { slug: "prod-1", color: null, name: "Free Product", price: 0, quantity: 5, image: null },
      ]
      localStorage.getItem.mockReturnValue(JSON.stringify(storedItems))

      renderWithProvider(<TestComponent />)

      expect(screen.getByTestId("count").textContent).toBe("5")
      expect(screen.getByTestId("total").textContent).toBe("0")
    })
  })

  describe("useCart hook", () => {
    it("should throw error when used outside provider", () => {
      const BadComponent = () => {
        useCart()
        return <div>Bad</div>
      }

      // The hook should throw when used outside provider
      // This is tested by rendering without CartProvider and expecting an error
      expect(() => {
        render(<BadComponent />)
      }).toThrow("useCart must be used within CartProvider")
    })
  })
})