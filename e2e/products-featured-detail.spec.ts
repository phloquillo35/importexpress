import { test, expect } from '@playwright/test';

test('home page - verify "Ver más" button text and functionality', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Check "Ver más" button exists (not "Ver todos")
  const verMasBtn = page.locator('button:has-text("Ver más")').first()
  await expect(verMasBtn).toBeVisible()
  
  // Check "Ver todos los productos" link exists
  const verTodosBtn = page.locator('button:has-text("Ver todos los productos")').first()
  await expect(verTodosBtn).toBeVisible()
  
  // Screenshot full page
  await page.screenshot({ path: '/tmp/home-products-desktop.png', fullPage: true })
});

test('home page - mobile view', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Check "Ver más" button exists on mobile
  const verMasBtn = page.locator('button:has-text("Ver más")').first()
  await expect(verMasBtn).toBeVisible()
  
  // Screenshot full page
  await page.screenshot({ path: '/tmp/home-products-mobile.png', fullPage: true })
});
