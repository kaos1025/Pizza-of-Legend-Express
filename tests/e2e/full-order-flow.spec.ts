import { test, expect } from '@playwright/test';

test.describe('Full Order Flow', () => {
  test('complete pizza order from menu to tracking', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    // Click "Signature Pizzas" tab
    await page.getByRole('button', { name: /Signature Pizzas/i }).click();
    await page.waitForTimeout(500);

    // Click first pizza card
    const firstPizza = page.locator('[role="button"]').filter({ hasText: /₩/ }).first();
    await firstPizza.click();
    await page.waitForTimeout(500);

    // Bottom sheet should be open — find Add to Cart button
    const addToCartBtn = page.getByRole('button', { name: /Add to Cart/i });
    await expect(addToCartBtn).toBeVisible({ timeout: 5000 });

    // Click Add to Cart
    await addToCartBtn.click();
    await page.waitForTimeout(1000);

    // Close upsell sheet if shown
    const upsellGoToCart = page.getByRole('button', { name: /Go to Cart|カートへ/i });
    if (await upsellGoToCart.isVisible({ timeout: 2000 }).catch(() => false)) {
      await upsellGoToCart.click();
    } else {
      // Click View Cart on bottom bar
      const viewCartBtn = page.getByRole('button', { name: /View Cart/i });
      await expect(viewCartBtn).toBeVisible({ timeout: 3000 });
      await viewCartBtn.click();
    }

    await page.waitForURL('**/cart');

    // Cart page — verify item exists
    await expect(page.locator('text=Checkout')).toBeVisible({ timeout: 5000 });

    // Click Checkout
    await page.getByRole('button', { name: /Checkout/i }).click();
    await page.waitForURL('**/checkout');

    // Select hotel
    const hotelSelect = page.locator('select');
    await hotelSelect.selectOption({ index: 1 }); // First hotel

    // Enter room number
    await page.getByPlaceholder(/room/i).fill('101');

    // Click Place Order
    await page.getByRole('button', { name: /Place Order/i }).click();

    // Should redirect to order tracking
    await page.waitForURL('**/order/**', { timeout: 10000 });

    // Verify order number
    await expect(page.locator('text=POL-')).toBeVisible({ timeout: 5000 });

    // Verify status stepper
    await expect(page.locator('text=Order Received')).toBeVisible();
  });
});
