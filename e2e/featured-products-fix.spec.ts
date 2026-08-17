import { test, expect } from '@playwright/test';

test('home page - 12 unique featured products on desktop', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Wait for products to load
  await page.waitForSelector('text=Productos Destacados');
  
  // Count product cards
  const cards = page.locator('.grid > [class*="rounded-2xl"][class*="border"]')
  const count = await cards.count()
  console.log(`Product cards found on desktop: ${count}`)
  
  // Should have at least 12 cards
  expect(count).toBeGreaterThanOrEqual(12)
  
  // Check for unique product IDs (no duplicates)
  const productIds = await page.evaluate(() => {
    const cards = document.querySelectorAll('.grid > [class*="rounded-2xl"][class*="border"] a[data-testid="product-link"]');
    return Array.from(cards).map(a => a.href);
  });
  const uniqueIds = new Set(productIds);
  console.log(`Total cards: ${productIds.length}, Unique: ${uniqueIds.size}`);
  expect(productIds.length).toBe(uniqueIds.size);
});

test('home page - 12 unique featured products on mobile', async ({ page }) => {
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
  
  // Check for unique product IDs (no duplicates)
  const productIds = await page.evaluate(() => {
    const cards = document.querySelectorAll('.grid > [class*="rounded-2xl"][class*="border"] a[data-testid="product-link"]');
    return Array.from(cards).map(a => a.href);
  });
  const uniqueIds = new Set(productIds);
  console.log(`Total cards: ${productIds.length}, Unique: ${uniqueIds.size}`);
  expect(productIds.length).toBe(uniqueIds.size);
});

test('home page - "Ver más" button loads more unique products', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Wait for products to load
  await page.waitForSelector('text=Productos Destacados');
  
  // Get initial count
  let productIds = await page.evaluate(() => {
    const cards = document.querySelectorAll('.grid > [class*="rounded-2xl"][class*="border"] a[data-testid="product-link"]');
    return Array.from(cards).map(a => a.href);
  });
  const initialCount = productIds.length;
  console.log(`Initial count: ${initialCount}`);
  
  // Click "Ver más" button
  const verMasBtn = page.locator('button:has-text("Ver más")').first()
  await verMasBtn.click()
  
  // Wait for loading
  await page.waitForTimeout(1500)
  
  // Check if more products loaded (should have more than initial)
  productIds = await page.evaluate(() => {
    const cards = document.querySelectorAll('.grid > [class*="rounded-2xl"][class*="border"] a[data-testid="product-link"]');
    return Array.from(cards).map(a => a.href);
  });
  const newCount = productIds.length;
  console.log(`After "Ver más": ${newCount}`);
  
  // Should have more products
  expect(newCount).toBeGreaterThan(initialCount);
  
  // Check for duplicates
  const uniqueIds = new Set(productIds);
  console.log(`Total cards: ${productIds.length}, Unique: ${uniqueIds.size}`);
  expect(productIds.length).toBe(uniqueIds.size);
});
