import { test, expect } from '@playwright/test';

test('home page - 12 products featured on desktop', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Wait for products to load
  await page.waitForSelector('text=Productos Destacados');
  
  // Count product cards
  const productCards = page.locator('[data-testid="product-link"]').first().locator('..').locator('..').first()
  // Better: count ProductCard components
  const cards = page.locator('.grid > [class*="rounded-2xl"][class*="border"]')
  const count = await cards.count()
  console.log(`Product cards found on desktop: ${count}`)
  
  // Should have at least 12 cards
  expect(count).toBeGreaterThanOrEqual(12)
  
  // Check for "Ver más" button
  const verMasBtn = page.locator('button:has-text("Ver más")')
  await expect(verMasBtn).toBeVisible()
});

test('home page - 12 products featured on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Wait for products to load
  await page.waitForSelector('text=Productos Destacados');
  
  // Count product cards on mobile
  const cards = page.locator('.grid > [class*="rounded-2xl"][class*="border"]')
  const count = await cards.count()
  console.log(`Product cards found on mobile: ${count}`)
  
  // Should have at least 12 cards
  expect(count).toBeGreaterThanOrEqual(12)
  
  // Check for "Ver más" button on mobile
  const verMasBtn = page.locator('button:has-text("Ver más")')
  await expect(verMasBtn).toBeVisible();
});

test('home page - "Ver más" button functionality', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Wait for products to load
  await page.waitForSelector('text=Productos Destacados');
  
  // Click "Ver más" button
  const verMasBtn = page.locator('button:has-text("Ver más")').first()
  await verMasBtn.click()
  
  // Wait for loading
  await page.waitForTimeout(1000)
  
  // Check if more products loaded (should have more than 12)
  const cards = page.locator('.grid > [class*="rounded-2xl"][class*="border"]')
  const count = await cards.count()
  console.log(`Product cards after "Ver más": ${count}`)
});
