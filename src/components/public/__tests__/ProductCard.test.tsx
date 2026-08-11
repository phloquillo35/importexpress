import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { ProductCard } from "@/components/public/ProductCard"
import { CartProvider, useCart } from "@/context/CartContext"

vi.mock("@/lib/flyToCart", () => ({ flyToCart: vi.fn() }))
vi.mock("@/lib/exchange-rate", () => ({ fetchExchangeRate: vi.fn().mockResolvedValue(1000) }))
vi.mock("@/lib/utils", () => ({ lockScroll: vi.fn(), unlockScroll: vi.fn() }))

const mockProduct = {
  slug: "test-product",
  name: "Test Product",
  priceUSD: 10,
  priceARS: 10000,
  finalPriceARS: 12000,
  images: ["https://example.com/image.jpg"],
  stock: 10,
  isAvailable: true,
  hasFinancing: true,
  freeShipping: true,
  category: {
    name: "Electronics",
    slug: "electronics",
    parent: { name: "Tech", slug: "tech" },
  },
}

const renderWithProvider = (ui: React.ReactNode) => {
  return render(<CartProvider>{ui}</CartProvider>)
}

describe("ProductCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("should render product name", () => {
    renderWithProvider(<ProductCard product={mockProduct} />)
    expect(screen.getByText("Test Product")).toBeInTheDocument()
  })

  it("should render product price in ARS", () => {
    renderWithProvider(<ProductCard product={mockProduct} />)
    expect(screen.getByText("$12.000 ARS")).toBeInTheDocument()
  })

  it("should render category with parent", () => {
    renderWithProvider(<ProductCard product={mockProduct} />)
    expect(screen.getByText("TECH - ELECTRONICS")).toBeInTheDocument()
  })

  it("should render financing badge when hasFinancing is true", () => {
    renderWithProvider(<ProductCard product={mockProduct} />)
    expect(screen.getByText("3 o 6 cuotas")).toBeInTheDocument()
  })

  it("should render free shipping badge when freeShipping is true", () => {
    renderWithProvider(<ProductCard product={mockProduct} />)
    expect(screen.getByText("Envío gratis")).toBeInTheDocument()
  })

  it("should render product image", () => {
    renderWithProvider(<ProductCard product={mockProduct} />)
    const img = screen.getByAltText("Test Product")
    expect(img).toHaveAttribute("src", "https://example.com/image.jpg")
  })

  it("should show placeholder when no images", () => {
    const productNoImages = { ...mockProduct, images: [] }
    renderWithProvider(<ProductCard product={productNoImages} />)
    expect(screen.getByTestId("product-placeholder")).toBeInTheDocument()
  })

  it("should render color swatch when colorName provided", () => {
    renderWithProvider(<ProductCard product={mockProduct} colorName="red" />)
    expect(screen.getByText("Red")).toBeInTheDocument()
    expect(screen.getByTestId("color-swatch")).toBeInTheDocument()
  })

  it("should render multiple color swatches when product has multiple colors", () => {
    const productMultiColor = {
      ...mockProduct,
      images: [
        { url: "https://example.com/red.jpg", color: "red" },
        { url: "https://example.com/blue.jpg", color: "blue" },
      ],
    }
    renderWithProvider(<ProductCard product={productMultiColor} />)
    expect(screen.getAllByTestId("color-swatch")).toHaveLength(2)
  })

  it("should call flyToCart when add button clicked", async () => {
    const { flyToCart } = await import("@/lib/flyToCart")
    renderWithProvider(<ProductCard product={mockProduct} />)

    const addButton = screen.getByText("Agregar")
    act(() => {
      fireEvent.click(addButton)
    })

    expect(flyToCart).toHaveBeenCalled()
  })

  it("should add item to cart when add button clicked", () => {
    renderWithProvider(<ProductCard product={mockProduct} />)

    const addButton = screen.getByText("Agregar")
    act(() => {
      fireEvent.click(addButton)
    })

    // Use the cart context directly
    const cartItems = screen.getByTestId("cart-items")
    expect(cartItems).toBeInTheDocument()
  })

  it("should add item with color when colorName provided", () => {
    renderWithProvider(<ProductCard product={mockProduct} colorName="red" />)

    const addButton = screen.getByText("Agregar")
    act(() => {
      fireEvent.click(addButton)
    })

    // Verify the cart has the item with color
    expect(screen.getByText("Test Product (red)")).toBeInTheDocument()
  })

  it("should increment quantity when same product added twice", () => {
    renderWithProvider(<ProductCard product={mockProduct} />)

    const addButton = screen.getByText("Agregar")
    act(() => {
      fireEvent.click(addButton)
      fireEvent.click(addButton)
    })

    // Check that quantity is 2
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("should navigate to product page when card clicked", () => {
    renderWithProvider(<ProductCard product={mockProduct} />)

    const link = screen.getByRole("link", { name: /test product/i })
    expect(link).toHaveAttribute("href", "/productos/test-product")
  })

  it("should navigate to product page with color query when colorName provided", () => {
    renderWithProvider(<ProductCard product={mockProduct} colorName="red" />)

    const link = screen.getByRole("link", { name: /test product/i })
    expect(link).toHaveAttribute("href", "/productos/test-product?color=red")
  })

  it("should show 'Disponible' badge", () => {
    renderWithProvider(<ProductCard product={mockProduct} />)
    expect(screen.getByText("Disponible")).toBeInTheDocument()
  })

  it("should use finalPriceARS when available", () => {
    const productWithFinal = { ...mockProduct, finalPriceARS: 15000 }
    renderWithProvider(<ProductCard product={productWithFinal} />)
    expect(screen.getByText("$15.000 ARS")).toBeInTheDocument()
  })

  it("should fall back to priceARS when finalPriceARS not available", () => {
    const productNoFinal = { ...mockProduct, finalPriceARS: 0 }
    renderWithProvider(<ProductCard product={productNoFinal} />)
    expect(screen.getByText("$10.000 ARS")).toBeInTheDocument()
  })

  it("should calculate price from exchange rate when no ARS prices", async () => {
    const productNoARS = { ...mockProduct, priceARS: null, finalPriceARS: 0 }
    renderWithProvider(<ProductCard product={productNoARS} />)

    await waitFor(() => {
      expect(screen.getByText("$10.000 ARS")).toBeInTheDocument()
    })
  })

  it("should not show financing badge when hasFinancing is false", () => {
    const productNoFinancing = { ...mockProduct, hasFinancing: false }
    renderWithProvider(<ProductCard product={productNoFinancing} />)
    expect(screen.queryByText("3 o 6 cuotas")).not.toBeInTheDocument()
  })

  it("should not show free shipping badge when freeShipping is false", () => {
    const productNoFreeShipping = { ...mockProduct, freeShipping: false }
    renderWithProvider(<ProductCard product={productNoFreeShipping} />)
    expect(screen.queryByText("Envío gratis")).not.toBeInTheDocument()
  })

  it("should render category without parent when parent is null", () => {
    const productNoParent = {
      ...mockProduct,
      category: { name: "Electronics", slug: "electronics", parent: null },
    }
    renderWithProvider(<ProductCard product={productNoParent} />)
    expect(screen.getByText("ELECTRONICS")).toBeInTheDocument()
  })

  it("should not render category when category is null", () => {
    const productNoCategory = { ...mockProduct, category: null }
    renderWithProvider(<ProductCard product={productNoCategory} />)
    expect(screen.queryByText("ELECTRONICS")).not.toBeInTheDocument()
  })
})