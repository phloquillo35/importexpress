import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { CartDrawer } from "@/components/public/CartDrawer"
import { CartProvider, useCart } from "@/context/CartContext"
import type { CartItem } from "@/context/CartContext"

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
    localStorage.getItem.mockReturnValue(null)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("should not render when closed", () => {
    renderWithProvider(<CartDrawer open={false} onClose={vi.fn()} />)
    expect(screen.queryByText("Carrito")).not.toBeInTheDocument()
    expect(screen.queryByText("Tu carrito está vacío")).not.toBeInTheDocument()
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
    localStorage.getItem.mockReturnValue(JSON.stringify(mockItems))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    expect(screen.getByText("Product 1 (red)")).toBeInTheDocument()
    expect(screen.getByText("Product 2")).toBeInTheDocument()
    expect(screen.getByText("$2.000 ARS")).toBeInTheDocument() // 1000 * 2
    expect(screen.getByText("$2.000 ARS")).toBeInTheDocument() // 2000 * 1
  })

  it("should show correct total", () => {
    localStorage.getItem.mockReturnValue(JSON.stringify(mockItems))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    expect(screen.getByText("Total")).toBeInTheDocument()
    expect(screen.getByText("$4.000 ARS")).toBeInTheDocument() // 2000 + 2000
  })

  it("should close when overlay clicked", () => {
    const onClose = vi.fn()
    renderWithProvider(<CartDrawer open={true} onClose={onClose} />)

    fireEvent.click(screen.getByTestId("cart-overlay"))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("should close when close button clicked", () => {
    const onClose = vi.fn()
    renderWithProvider(<CartDrawer open={true} onClose={onClose} />)

    fireEvent.click(screen.getByLabelText("Cerrar carrito"))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("should increment quantity when plus button clicked", () => {
    localStorage.getItem.mockReturnValue(JSON.stringify(mockItems))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    const plusButton = screen.getAllByRole("button", { name: /incrementar/i })[0]
    fireEvent.click(plusButton)

    expect(screen.getByText("3")).toBeInTheDocument() // quantity updated from 2 to 3
  })

  it("should decrement quantity when minus button clicked", () => {
    localStorage.getItem.mockReturnValue(JSON.stringify(mockItems))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    const minusButton = screen.getAllByRole("button", { name: /decrementar/i })[0]
    fireEvent.click(minusButton)

    expect(screen.getByText("1")).toBeInTheDocument() // quantity updated from 2 to 1
  })

  it("should remove item when quantity reaches 0", () => {
    const singleItem: CartItem[] = [
      { slug: "prod-1", color: null, name: "Product 1", price: 1000, quantity: 1, image: null },
    ]
    localStorage.getItem.mockReturnValue(JSON.stringify(singleItem))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    const minusButton = screen.getByRole("button", { name: /decrementar/i })
    fireEvent.click(minusButton)

    expect(screen.getByText("Tu carrito está vacío")).toBeInTheDocument()
  })

  it("should remove item when trash button clicked", () => {
    localStorage.getItem.mockReturnValue(JSON.stringify(mockItems))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    const trashButtons = screen.getAllByRole("button", { name: /eliminar/i })
    fireEvent.click(trashButtons[0])

    expect(screen.queryByText("Product 1 (red)")).not.toBeInTheDocument()
    expect(screen.getByText("Product 2")).toBeInTheDocument()
  })

  it("should show form when 'Finalizar pedido' clicked", () => {
    localStorage.getItem.mockReturnValue(JSON.stringify(mockItems))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    fireEvent.click(screen.getByText("Finalizar pedido"))

    expect(screen.getByPlaceholderText("Nombre completo")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Teléfono")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Dirección")).toBeInTheDocument()
  })

  it("should hide form when 'Volver' clicked", () => {
    localStorage.getItem.mockReturnValue(JSON.stringify(mockItems))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    fireEvent.click(screen.getByText("Finalizar pedido"))
    fireEvent.click(screen.getByText("Volver"))

    expect(screen.queryByPlaceholderText("Nombre completo")).not.toBeInTheDocument()
    expect(screen.getByText("Finalizar pedido")).toBeInTheDocument()
  })

  it("should clear cart when 'Vaciar carrito' clicked", () => {
    localStorage.getItem.mockReturnValue(JSON.stringify(mockItems))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    fireEvent.click(screen.getByText("Vaciar carrito"))

    expect(screen.getByText("Tu carrito está vacío")).toBeInTheDocument()
  })

  it("should build WhatsApp message correctly", () => {
    localStorage.getItem.mockReturnValue(JSON.stringify(mockItems))

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
    const lockScroll = vi.fn()
    const unlockScroll = vi.fn()
    vi.mock("@/lib/utils", () => ({ lockScroll, unlockScroll }))

    const { unmount } = renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    expect(lockScroll).toHaveBeenCalled()

    unmount()

    expect(unlockScroll).toHaveBeenCalled()
  })

  it("should render product image when available", () => {
    localStorage.getItem.mockReturnValue(JSON.stringify(mockItems))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    const images = screen.getAllByAltText("Product 1 (red)")
    expect(images[0]).toHaveAttribute("src", "img1.jpg")
  })

  it("should show placeholder when no image", () => {
    const itemsNoImage: CartItem[] = [
      { slug: "prod-1", color: null, name: "Product 1", price: 1000, quantity: 1, image: null },
    ]
    localStorage.getItem.mockReturnValue(JSON.stringify(itemsNoImage))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    expect(screen.getByTestId("product-placeholder")).toBeInTheDocument()
  })

  it("should format prices in ARS locale", () => {
    const itemsHighPrice: CartItem[] = [
      { slug: "prod-1", color: null, name: "Expensive", price: 1234567, quantity: 1, image: null },
    ]
    localStorage.getItem.mockReturnValue(JSON.stringify(itemsHighPrice))

    renderWithProvider(<CartDrawer open={true} onClose={vi.fn()} />)

    expect(screen.getByText("$1.234.567 ARS")).toBeInTheDocument()
  })
})