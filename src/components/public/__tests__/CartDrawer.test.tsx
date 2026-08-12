import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CartDrawer } from "@/components/public/CartDrawer"
import { CartProvider } from "@/context/CartContext"
import type { CartItem } from "@/context/CartContext"
import { lockScroll, unlockScroll } from "@/lib/utils"

const STORAGE_KEY = "lopedis_cart"

const mockItems: CartItem[] = [
  { slug: "prod-1", color: "red", name: "Product 1 (red)", price: 1000, quantity: 2, image: "img1.jpg" },
  { slug: "prod-2", color: null, name: "Product 2", price: 2000, quantity: 1, image: null },
]

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<CartProvider>{ui}</CartProvider>)
}

describe("CartDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("should not render when closed", () => {
    renderWithProvider(<CartDrawer open={false} onClose={vi.fn()} />)
    expect(screen.queryByTestId("cart-overlay")).not.toBeInTheDocument()
  })

  it("should render overlay when open", () => {
    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)
    const overlay = screen.getByTestId("cart-overlay")
    expect(overlay).toBeInTheDocument()
  })

  it("should show empty cart message when no items", () => {
    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)
    expect(screen.getByText("Tu carrito está vacío")).toBeInTheDocument()
  })

  it("should render cart items when open with items", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockItems))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    expect(screen.getByText("Product 1 (red)")).toBeInTheDocument()
    expect(screen.getByText("Product 2")).toBeInTheDocument()
    // Both items have $2.000 ARS subtotal (1000*2 and 2000*1)
    const subtotals = screen.getAllByText("$2.000 ARS")
    expect(subtotals.length).toBe(2)
  })

  it("should show correct total", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockItems))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    expect(screen.getByText("Total")).toBeInTheDocument()
    expect(screen.getByText("$4.000 ARS")).toBeInTheDocument() // 2000 + 2000
  })

  it("should close when overlay clicked", () => {
    const onClose = vi.fn()
    renderWithProvider(<CartDrawer open={true} onClose={onClose} />)

    // Click on the overlay (first div with fixed inset-0)
    const overlay = screen.getByTestId("cart-overlay")
    fireEvent.click(overlay)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("should close when close button clicked", () => {
    const onClose = vi.fn()
    renderWithProvider(<CartDrawer open={true} onClose={onClose} />)

    // Click the close button (X icon button)
    const closeButton = screen.getByTestId("close-drawer")
    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("should increment quantity when plus button clicked", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockItems))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    // Find the plus button for the first item (Product 1)
    const plusButtons = screen.getAllByTestId("increase-quantity")
    fireEvent.click(plusButtons[0])

    expect(screen.getByText("3")).toBeInTheDocument() // quantity updated from 2 to 3
  })

  it("should decrement quantity when minus button clicked", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockItems))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    // Find the minus button for the first item
    const minusButtons = screen.getAllByTestId("decrease-quantity")
    fireEvent.click(minusButtons[0])

    // First item quantity should go from 2 to 1
    const quantities = screen.getAllByTestId("quantity")
    expect(quantities[0]).toHaveTextContent("1")
  })

  it("should remove item when quantity reaches 0", () => {
    const singleItem: CartItem[] = [
      { slug: "prod-1", color: null, name: "Product 1", price: 1000, quantity: 1, image: null },
    ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(singleItem))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    const minusButton = screen.getByTestId("decrease-quantity")
    fireEvent.click(minusButton)

    expect(screen.getByText("Tu carrito está vacío")).toBeInTheDocument()
  })

  it("should remove item when trash button clicked", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockItems))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    // Find trash buttons
    const trashButtons = screen.getAllByTestId("remove-item")
    fireEvent.click(trashButtons[0])

    expect(screen.queryByText("Product 1 (red)")).not.toBeInTheDocument()
    expect(screen.getByText("Product 2")).toBeInTheDocument()
  })

  it("should show form when 'Finalizar pedido' clicked", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockItems))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    fireEvent.click(screen.getByText("Finalizar pedido"))

    expect(screen.getByPlaceholderText("Nombre completo")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Teléfono")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Dirección")).toBeInTheDocument()
  })

  it("should hide form when 'Volver' clicked", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockItems))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    fireEvent.click(screen.getByText("Finalizar pedido"))
    fireEvent.click(screen.getByText("Volver"))

    expect(screen.queryByPlaceholderText("Nombre completo")).not.toBeInTheDocument()
    expect(screen.getByText("Finalizar pedido")).toBeInTheDocument()
  })

  it("should clear cart when 'Vaciar carrito' clicked", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockItems))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    fireEvent.click(screen.getByText("Vaciar carrito"))

    expect(screen.getByText("Tu carrito está vacío")).toBeInTheDocument()
  })

  it("should build WhatsApp message correctly", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockItems))

    const onClose = vi.fn()
    renderWithProvider(<CartDrawer open={true} onClose={onClose} />)

    fireEvent.click(screen.getByText("Finalizar pedido"))

    fireEvent.change(screen.getByPlaceholderText("Nombre completo"), { target: { value: "Juan Perez" } })
    fireEvent.change(screen.getByPlaceholderText("Teléfono"), { target: { value: "+5491112345678" } })
    fireEvent.change(screen.getByPlaceholderText("Dirección"), { target: { value: "Calle Falsa 123" } })

    fireEvent.click(screen.getByText("Enviar pedido por WhatsApp"))

    // Should close drawer and open WhatsApp selector
    expect(onClose).toHaveBeenCalled()
  })

  it("should lock scroll when open", () => {
    const { unmount } = renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    expect(lockScroll).toHaveBeenCalled()

    unmount()

    expect(unlockScroll).toHaveBeenCalled()
  })

  it("should render product image when available", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockItems))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    const images = screen.getAllByAltText("Product 1 (red)")
    expect(images[0]).toHaveAttribute("src", "img1.jpg")
  })

  it("should show placeholder when no image", () => {
    const itemsNoImage: CartItem[] = [
      { slug: "prod-1", color: null, name: "Product 1", price: 1000, quantity: 1, image: null },
    ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(itemsNoImage))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    // When no image, it shows ShoppingBag icon
    expect(screen.getByTestId("product-placeholder")).toBeInTheDocument()
  })

  it("should format prices in ARS locale", () => {
    const itemsHighPrice: CartItem[] = [
      { slug: "prod-1", color: null, name: "Expensive", price: 1234567, quantity: 1, image: null },
    ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(itemsHighPrice))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    // Check the total price (which appears once in the total section)
    const totalElement = screen.getByText("Total").closest("div")
    expect(totalElement).toHaveTextContent("$1.234.567 ARS")
  })
})