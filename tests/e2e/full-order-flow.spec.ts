import { test, expect } from '@playwright/test';

test.describe('Full Order Flow', () => {
  test('complete pizza order from menu to tracking', async ({ page }) => {
    // Fresh start
    await page.goto('/en');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto('/en');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Go to Signature Pizzas
    await page.locator('[data-testid="tab-pizza"]').click();
    await page.waitForTimeout(800);

    // Click first pizza card
    await page.locator('[data-testid^="menu-card"]').first().click();
    await page.waitForTimeout(800);

    // Add to cart
    await page.locator('[data-testid="add-to-cart"]').click();
    await page.waitForTimeout(2000);

    // Upsell sheet — go to cart
    const goToCartBtn = page.locator('text=Go to Cart');
    if (await goToCartBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await goToCartBtn.click();
    } else {
      const close = page.locator('[data-slot="sheet-close"]').first();
      if (await close.isVisible({ timeout: 500 }).catch(() => false)) await close.click();
      await page.waitForTimeout(500);
      await page.locator('[data-testid="view-cart"]').click();
    }
    await page.waitForURL('**/cart', { timeout: 5000 });
    await page.waitForTimeout(500);

    // Cart page — Checkout
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("Checkout")').click();
    await page.waitForURL('**/checkout', { timeout: 10000 });
    await page.waitForTimeout(1500);

    // Select hotel
    await page.locator('[data-testid="hotel-select"]').selectOption({ index: 1 });

    // Enter room
    await page.locator('[data-testid="room-number"]').fill('101');

    // Fill messenger ID (now required)
    // The messenger platform dropdown should default to WhatsApp for EN locale
    await page.locator('input[placeholder*="ID"]').first().fill('test_user_123');

    // Place order
    await page.locator('[data-testid="place-order"]').click();

    // Wait for navigation — order page or back to menu with order in header
    await page.waitForTimeout(5000);

    // Verify order was created — POL- number visible somewhere on page
    await expect(page.getByText(/POL-\d{8}-\d{3}/).first()).toBeVisible({ timeout: 10000 });
  });
});
