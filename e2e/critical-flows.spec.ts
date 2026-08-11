import { test, expect } from "@playwright/test"

test.describe("ImportExpress - Critical User Flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
  })

  test("should load homepage successfully", async ({ page }) => {
    await expect(page).toHaveTitle(/ImportExpress/)
    await expect(page.locator("h1")).toBeVisible()
  })

  test("should navigate to products page", async ({ page }) => {
    await page.click('a[href="/productos"]')
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveURL(/\/productos/)
    await expect(page.locator("h1")).toContainText(/producto/i)
  })

  test("should add product to cart and open drawer", async ({ page }) => {
    await page.goto("/productos")
    await page.waitForLoadState("networkidle")

    // Wait for products to load
    const productCard = page.locator('[class*="ProductCard"]').first()
    await expect(productCard).toBeVisible({ timeout: 10000 })

    // Click add to cart button
    const addButton = productCard.locator('button:has-text("Agregar")').first()
    await expect(addButton).toBeVisible()
    await addButton.click()

    // Wait for cart drawer to open
    await expect(page.locator('text="Carrito"')).toBeVisible({ timeout: 5000 })

    // Verify item in cart
    await expect(page.locator('text="Test Product"').first()).toBeVisible()
  })

  test("should update quantity in cart drawer", async ({ page }) => {
    await page.goto("/productos")
    await page.waitForLoadState("networkidle")

    const productCard = page.locator('[class*="ProductCard"]').first()
    await expect(productCard).toBeVisible({ timeout: 10000 })

    const addButton = productCard.locator('button:has-text("Agregar")').first()
    await addButton.click()

    await expect(page.locator('text="Carrito"')).toBeVisible({ timeout: 5000 })

    // Click plus button to increase quantity
    const plusButton = page.locator('button[aria-label*="incrementar"], button:has-text("+")').first()
    await plusButton.click()

    // Verify quantity updated
    await expect(page.locator('text="2"')).toBeVisible()
  })

  test("should remove item from cart", async ({ page }) => {
    await page.goto("/productos")
    await page.waitForLoadState("networkidle")

    const productCard = page.locator('[class*="ProductCard"]').first()
    await expect(productCard).toBeVisible({ timeout: 10000 })

    const addButton = productCard.locator('button:has-text("Agregar")').first()
    await addButton.click()

    await expect(page.locator('text="Carrito"')).toBeVisible({ timeout: 5000 })

    // Click trash button to remove
    const trashButton = page.locator('button[aria-label*="eliminar"], button:has-text("🗑")').first()
    await trashButton.click()

    // Verify cart is empty
    await expect(page.locator('text="Tu carrito está vacío"')).toBeVisible({ timeout: 5000 })
  })

  test("should proceed to checkout form", async ({ page }) => {
    await page.goto("/productos")
    await page.waitForLoadState("networkidle")

    const productCard = page.locator('[class*="ProductCard"]').first()
    await expect(productCard).toBeVisible({ timeout: 10000 })

    const addButton = productCard.locator('button:has-text("Agregar")').first()
    await addButton.click()

    await expect(page.locator('text="Carrito"')).toBeVisible({ timeout: 5000 })

    // Click "Finalizar pedido"
    await page.click('button:has-text("Finalizar pedido")')

    // Verify form fields appear
    await expect(page.locator('input[placeholder="Nombre completo"]')).toBeVisible()
    await expect(page.locator('input[placeholder="Teléfono"]')).toBeVisible()
    await expect(page.locator('input[placeholder="Dirección"]')).toBeVisible()
  })

  test("should fill checkout form and submit", async ({ page }) => {
    await page.goto("/productos")
    await page.waitForLoadState("networkidle")

    const productCard = page.locator('[class*="ProductCard"]').first()
    await expect(productCard).toBeVisible({ timeout: 10000 })

    const addButton = productCard.locator('button:has-text("Agregar")').first()
    await addButton.click()

    await expect(page.locator('text="Carrito"')).toBeVisible({ timeout: 5000 })

    await page.click('button:has-text("Finalizar pedido")')

    // Fill form
    await page.fill('input[placeholder="Nombre completo"]', "Juan Perez")
    await page.fill('input[placeholder="Teléfono"]', "+5491112345678")
    await page.fill('input[placeholder="Dirección"]', "Calle Falsa 123, CABA")

    // Submit form
    await page.click('button:has-text("Enviar pedido por WhatsApp")')

    // Should open WhatsApp selector or redirect
    await expect(page.locator('text="WhatsApp"')).toBeVisible({ timeout: 5000 })
  })

  test("should clear cart", async ({ page }) => {
    await page.goto("/productos")
    await page.waitForLoadState("networkidle")

    const productCard = page.locator('[class*="ProductCard"]').first()
    await expect(productCard).toBeVisible({ timeout: 10000 })

    const addButton = productCard.locator('button:has-text("Agregar")').first()
    await addButton.click()

    await expect(page.locator('text="Carrito"')).toBeVisible({ timeout: 5000 })

    // Click "Vaciar carrito"
    await page.click('button:has-text("Vaciar carrito")')

    // Verify cart is empty
    await expect(page.locator('text="Tu carrito está vacío"')).toBeVisible({ timeout: 5000 })
  })

  test("should persist cart across page navigation", async ({ page }) => {
    await page.goto("/productos")
    await page.waitForLoadState("networkidle")

    const productCard = page.locator('[class*="ProductCard"]').first()
    await expect(productCard).toBeVisible({ timeout: 10000 })

    const addButton = productCard.locator('button:has-text("Agregar")').first()
    await addButton.click()

    await expect(page.locator('text="Carrito"')).toBeVisible({ timeout: 5000 })

    // Navigate to home
    await page.click('a[href="/"]')
    await page.waitForLoadState("networkidle")

    // Open cart again
    await page.click('button[aria-label*="Carrito"]')
    await expect(page.locator('text="Carrito"')).toBeVisible({ timeout: 5000 })

    // Verify item still in cart
    await expect(page.locator('text="Test Product"').first()).toBeVisible()
  })

  test("should work on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Check mobile FAB cart button exists
    const fabButton = page.locator('button[aria-label*="Carrito"]').first()
    await expect(fabButton).toBeVisible()

    await page.goto("/productos")
    await page.waitForLoadState("networkidle")

    const productCard = page.locator('[class*="ProductCard"]').first()
    await expect(productCard).toBeVisible({ timeout: 10000 })

    const addButton = productCard.locator('button:has-text("Agregar")').first()
    await addButton.click()

    // Cart drawer should open on mobile
    await expect(page.locator('text="Carrito"')).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Admin Panel - Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin")
    await page.waitForLoadState("networkidle")
  })

  test("should load admin dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/\/admin/)
    await expect(page.locator("h1")).toContainText(/dashboard|panel/i)
  })

  test("should navigate to products admin", async ({ page }) => {
    await page.click('a[href="/admin/productos"]')
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveURL(/\/admin\/productos/)
  })

  test("should navigate to orders admin", async ({ page }) => {
    await page.click('a[href="/admin/pedidos"]')
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveURL(/\/admin\/pedidos/)
  })
})