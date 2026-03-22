import { test, expect } from '@playwright/test';

test.describe('Cart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('add item and modify quantity', async ({ page }) => {
    // Add pizza
    await page.locator('[data-testid="tab-pizza"]').click();
    await page.waitForTimeout(800);
    await page.locator('[data-testid^="menu-card"]').first().click();
    await page.waitForTimeout(800);
    await page.locator('[data-testid="add-to-cart"]').click();
    await page.waitForTimeout(2000);

    // Navigate to cart — try upsell "Go to Cart" first, then bottom bar
    const goToCart = page.locator('text=Go to Cart');
    if (await goToCart.isVisible({ timeout: 1500 }).catch(() => false)) {
      await goToCart.click();
    } else {
      // Close any remaining sheet
      const close = page.locator('[data-slot="sheet-close"]').first();
      if (await close.isVisible({ timeout: 500 }).catch(() => false)) await close.click();
      await page.waitForTimeout(500);
      await page.locator('[data-testid="view-cart"]').click();
    }
    await page.waitForURL('**/cart', { timeout: 5000 });
    await page.waitForTimeout(500);

    // Increase quantity
    await page.locator('[aria-label="Increase quantity"]').first().click();
    await page.waitForTimeout(500);

    // Decrease quantity
    await page.locator('[aria-label="Decrease quantity"]').first().click();
    await page.waitForTimeout(500);

    // Remove item
    await page.locator('[aria-label="Remove item"]').first().click();
    await page.waitForTimeout(500);

    // Empty state
    await expect(page.locator('text=/empty/i')).toBeVisible({ timeout: 5000 });
  });

  test('empty cart shows no checkout', async ({ page }) => {
    await page.goto('/en/cart');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/empty/i')).toBeVisible({ timeout: 5000 });
  });
});
