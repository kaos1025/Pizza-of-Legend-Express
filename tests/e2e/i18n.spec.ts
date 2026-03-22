import { test, expect } from '@playwright/test';

test.describe('Internationalization', () => {
  test('switch to Chinese', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    // Click Chinese flag button
    await page.getByRole('button', { name: /Switch to 中文/i }).click();
    await page.waitForURL('**/zh**');

    // Verify Chinese text
    await expect(page.locator('text=传奇披萨')).toBeVisible({ timeout: 5000 });
  });

  test('switch to Japanese', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    // Click Japanese flag button
    await page.getByRole('button', { name: /Switch to 日本語/i }).click();
    await page.waitForURL('**/ja**');

    // Verify Japanese text
    await expect(page.locator('text=伝説のピザ')).toBeVisible({ timeout: 5000 });
  });

  test('cart persists across language switch', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    // Add a pizza to cart
    await page.getByRole('button', { name: /Signature Pizzas/i }).click();
    await page.waitForTimeout(500);
    const firstPizza = page.locator('[role="button"]').filter({ hasText: /₩/ }).first();
    await firstPizza.click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Add to Cart/i }).click();
    await page.waitForTimeout(1500);

    // Close upsell
    const closeBtn = page.locator('[data-slot="sheet-close"]');
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click();
    }
    await page.waitForTimeout(300);

    // Switch to Chinese
    await page.getByRole('button', { name: /Switch to 中文/i }).click();
    await page.waitForURL('**/zh**');
    await page.waitForTimeout(500);

    // Cart should still have item (bottom bar visible)
    const cartBar = page.locator('text=₩');
    await expect(cartBar.first()).toBeVisible({ timeout: 5000 });
  });

  test('checkout payment notice shows in correct language', async ({ page }) => {
    // Add item first
    await page.goto('/en');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Signature Pizzas/i }).click();
    await page.waitForTimeout(500);
    const pizza = page.locator('[role="button"]').filter({ hasText: /₩/ }).first();
    await pizza.click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Add to Cart/i }).click();
    await page.waitForTimeout(1000);

    // Go to checkout
    await page.goto('/en/checkout');
    await page.waitForLoadState('networkidle');

    // English payment notice
    await expect(page.locator('text=Pay to the staff at your door')).toBeVisible({ timeout: 5000 });
  });
});
