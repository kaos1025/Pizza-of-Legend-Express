import { test, expect } from '@playwright/test';

test.describe('Cart', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/en');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('add item, change quantity, remove', async ({ page }) => {
    // Add a pizza
    await page.getByRole('button', { name: /Signature Pizzas/i }).click();
    await page.waitForTimeout(500);

    const firstPizza = page.locator('[role="button"]').filter({ hasText: /₩/ }).first();
    await firstPizza.click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /Add to Cart/i }).click();
    await page.waitForTimeout(1500);

    // Close upsell if visible
    const closeBtn = page.locator('[data-slot="sheet-close"]');
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click();
    }

    // Navigate to cart
    await page.goto('/en/cart');
    await page.waitForLoadState('networkidle');

    // Verify item exists
    const quantityText = page.locator('text=/^1$/');
    await expect(quantityText.first()).toBeVisible({ timeout: 5000 });

    // Click + to increase quantity
    const plusBtn = page.getByLabel(/Increase quantity/i).first();
    await plusBtn.click();
    await page.waitForTimeout(300);

    // Verify quantity is 2
    await expect(page.locator('span').filter({ hasText: '2' }).first()).toBeVisible();

    // Click - to decrease
    const minusBtn = page.getByLabel(/Decrease quantity/i).first();
    await minusBtn.click();
    await page.waitForTimeout(300);

    // Remove item
    const removeBtn = page.getByLabel(/Remove item/i).first();
    await removeBtn.click();
    await page.waitForTimeout(300);

    // Cart should be empty
    await expect(page.locator('text=/empty|비어/i')).toBeVisible({ timeout: 3000 });
  });

  test('empty cart cannot checkout', async ({ page }) => {
    await page.goto('/en/cart');
    await page.waitForLoadState('networkidle');

    // Should show empty state
    await expect(page.locator('text=/empty/i')).toBeVisible({ timeout: 5000 });

    // No checkout button
    const checkoutBtn = page.getByRole('button', { name: /Checkout/i });
    await expect(checkoutBtn).not.toBeVisible();
  });
});
