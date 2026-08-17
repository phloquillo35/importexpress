import { test, expect } from '@playwright/test';

test('admin hero page - no spinner', async ({ page }) => {
  await page.goto('http://localhost:3000/admin/hero');
  await page.waitForLoadState('networkidle');
  
  // Check that no spinner is present (before login redirect)
  const spinners = page.locator('[class*="animate-spin"], [class*="animate-pulse"]');
  const count = await spinners.count();
  console.log(`Spinners found on hero page: ${count}`);
  
  // Just verify no spinner regardless of auth state
  expect(count).toBe(0);
});

test('admin papelera page - no spinner', async ({ page }) => {
  await page.goto('http://localhost:3000/admin/papelera');
  await page.waitForLoadState('networkidle');
  
  // Check that no spinner is present
  const spinners = page.locator('[class*="animate-spin"], [class*="animate-pulse"]');
  const count = await spinners.count();
  console.log(`Spinners found on papelera page: ${count}`);
  
  expect(count).toBe(0);
});

test('home page hero section - no loading skeleton', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // Check that no animate-pulse skeletons are present
  const pulseElements = page.locator('[class*="animate-pulse"]');
  const count = await pulseElements.count();
  console.log(`Pulse elements found on home page: ${count}`);
  
  // Should see the hero content
  await expect(page.locator('text=Productos Destacados')).toBeVisible();
  expect(count).toBe(0);
});
