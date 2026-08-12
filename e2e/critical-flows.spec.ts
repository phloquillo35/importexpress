import { test, expect, Page } from "@playwright/test"

async function cartTrigger(page: Page) {
  return page.locator('[data-testid="cart-trigger"]:visible').first()
}

async function openCart(page: Page) {
  const trigger = await cartTrigger(page)
  await expect(trigger).toBeVisible({ timeout: 5000 })
  await trigger.click()
  await expect(page.locator('[data-testid="cart-overlay"]:visible')).toBeVisible({ timeout: 5000 })
}

async function goToProducts(page: Page) {
  const link = page.locator('a[href="/productos"]:visible').first()
  if ((await link.count()) > 0) {
    await link.click()
  } else {
    // Mobile: products link lives inside the hamburger menu
    await page.getByRole("button", { name: "Menú" }).click()
    await page.locator('a[href="/productos"]').first().click()
  }
  await expect(page).toHaveURL(/\/productos/, { timeout: 10000 })
}

async function addFirstProduct(page: Page) {
  const addButton = page.locator('[data-testid="add-to-cart"]').first()
  await expect(addButton).toBeVisible({ timeout: 10000 })
  await addButton.click()
}

test.describe("ImportExpress - Critical User Flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("load")
  })

  test("should load homepage successfully", async ({ page }) => {
    await expect(page).toHaveTitle(/Lo Pedís/)
    await expect(page.locator("h1, h2, main, [role=main]").first()).toBeVisible({ timeout: 10000 })
  })

  test("should navigate to products page", async ({ page }) => {
    await goToProducts(page)
    await expect(page.locator("h1")).toContainText("Catálogo", { timeout: 10000 })
  })

  test("should add product to cart and open drawer", async ({ page }) => {
    await page.goto("/productos")
    await addFirstProduct(page)
    await openCart(page)
    await expect(page.locator('[data-testid="quantity"]').first()).toBeVisible()
  })

  test("should update quantity in cart drawer", async ({ page }) => {
    await page.goto("/productos")
    await addFirstProduct(page)
    await openCart(page)

    await page.locator('[data-testid="increase-quantity"]').first().click()
    await expect(page.locator('[data-testid="quantity"]').first()).toHaveText("2")
  })

  test("should remove item from cart", async ({ page }) => {
    await page.goto("/productos")
    await addFirstProduct(page)
    await openCart(page)

    await page.locator('[data-testid="remove-item"]').first().click()
    await expect(page.locator("text=Tu carrito está vacío")).toBeVisible({ timeout: 5000 })
  })

  test("should proceed to checkout form", async ({ page }) => {
    await page.goto("/productos")
    await addFirstProduct(page)
    await openCart(page)

    await page.click("button:has-text('Finalizar pedido')")
    await expect(page.locator('input[placeholder="Nombre completo"]')).toBeVisible()
    await expect(page.locator('input[placeholder="Teléfono"]')).toBeVisible()
    await expect(page.locator('input[placeholder="Dirección"]')).toBeVisible()
  })

  test("should fill checkout form and submit", async ({ page }) => {
    await page.goto("/productos")
    await addFirstProduct(page)
    await openCart(page)

    await page.click("button:has-text('Finalizar pedido')")
    await page.fill('input[placeholder="Nombre completo"]', "Juan Perez")
    await page.fill('input[placeholder="Teléfono"]', "+5491112345678")
    await page.fill('input[placeholder="Dirección"]', "Calle Falsa 123, CABA")

    await page.click("button:has-text('Enviar pedido por WhatsApp')")

    await expect(page.locator("text=Elegí con quién hablar")).toBeVisible({ timeout: 5000 })
  })

  test("should clear cart", async ({ page }) => {
    await page.goto("/productos")
    await addFirstProduct(page)
    await openCart(page)

    await page.click("button:has-text('Vaciar carrito')")
    await expect(page.locator("text=Tu carrito está vacío")).toBeVisible({ timeout: 5000 })
  })

  test("should persist cart across page navigation", async ({ page }) => {
    await page.goto("/productos")
    await addFirstProduct(page)
    await openCart(page)

    // Close drawer before navigating (overlay would block the nav link)
    await page.locator('[data-testid="close-drawer"]:visible').click()
    await expect(page.locator('[data-testid="cart-overlay"]:visible')).toBeHidden()

    await page.locator('a[href="/"]:visible').first().click()
    await expect(page).toHaveURL(/\/$/)
    await page.waitForLoadState("load")

    await openCart(page)
    await expect(page.locator('[data-testid="quantity"]').first()).toBeVisible()
  })

  test("should work on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto("/productos")
    await addFirstProduct(page)

    // Mobile FAB appears once cart has items
    const fabButton = await cartTrigger(page)
    await expect(fabButton).toBeVisible({ timeout: 5000 })
    await fabButton.click()

    await expect(page.locator('[data-testid="cart-overlay"]:visible')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="quantity"]').first()).toBeVisible()
  })
})

test.describe("Admin Panel - Smoke Tests", () => {
  test("should redirect to login when not authenticated", async ({ page }) => {
    await page.goto("/admin")
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    await expect(page.locator("input").first()).toBeVisible({ timeout: 10000 })
  })

  test("should show login page with form", async ({ page }) => {
    await page.goto("/login")
    await page.waitForLoadState("load")
    await expect(page.locator('h1, h2').first()).toBeVisible()
    await expect(page.locator("input").first()).toBeVisible()
  })
})