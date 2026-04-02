import { test, expect } from '@playwright/test';

test.describe('Half & Half Pizza — Selection Names Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/en');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
  });

  /**
   * Helper: select two halves and add to cart.
   * Returns the names shown in the left/right labels.
   */
  async function addHalfHalfToCart(page: import('@playwright/test').Page) {
    // Open Half & Half tab
    await page.locator('[data-testid="tab-half_half"]').click();
    await page.waitForTimeout(1000);

    // Select left half — click on the left half circle area
    await page.locator('[data-testid="half-left"]').click();
    await page.waitForTimeout(1000);

    // Click first pizza button inside the bottom sheet picker grid
    const sheetContent = page.locator('[data-slot="sheet-content"]');
    await sheetContent.locator('button.rounded-xl').first().click();
    await page.waitForTimeout(1000);

    // Capture left pizza name from label (format: "LEFT HALF\n<pizza name>")
    const leftLabel = await page.locator('[data-testid="half-left-label"]').innerText();
    const leftPizzaName = leftLabel.split('\n').pop()?.trim() || '';

    // Select right half
    await page.locator('[data-testid="half-right"]').click();
    await page.waitForTimeout(1000);

    // Click third pizza button in sheet
    await sheetContent.locator('button.rounded-xl').nth(2).click();
    await page.waitForTimeout(1000);

    // Capture right pizza name
    const rightLabel = await page.locator('[data-testid="half-right-label"]').innerText();
    const rightPizzaName = rightLabel.split('\n').pop()?.trim() || '';

    // Scroll to and select L size
    const sizeBtn = page.locator('[data-testid="hh-size-L"]');
    await sizeBtn.scrollIntoViewIfNeeded();
    await sizeBtn.click();
    await page.waitForTimeout(300);

    // Add to cart
    const addBtn = page.locator('[data-testid="hh-add-to-cart"]');
    await addBtn.scrollIntoViewIfNeeded();
    await expect(addBtn).toBeEnabled({ timeout: 5000 });
    await addBtn.click();
    await page.waitForTimeout(1500);

    return { leftPizzaName, rightPizzaName };
  }

  /** Helper: navigate from upsell sheet to cart page */
  async function goToCart(page: import('@playwright/test').Page) {
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
  }

  test('cart page shows half-half selection names', async ({ page }) => {
    const { leftPizzaName, rightPizzaName } = await addHalfHalfToCart(page);
    await goToCart(page);

    // Verify both pizza names are displayed in the cart
    const cartContent = await page.textContent('main');
    expect(cartContent).toContain(leftPizzaName);
    expect(cartContent).toContain(rightPizzaName);
  });

  test('checkout order summary shows half-half selection names', async ({ page }) => {
    const { leftPizzaName, rightPizzaName } = await addHalfHalfToCart(page);
    await goToCart(page);

    // Go to checkout
    await page.locator('button:has-text("Checkout")').click();
    await page.waitForURL('**/checkout', { timeout: 10000 });
    await page.waitForTimeout(1500);

    // Expand Order Summary accordion
    const accordionTrigger = page.locator('button:has-text("Order Summary")');
    await accordionTrigger.click();
    await page.waitForTimeout(500);

    // Verify both pizza names visible in checkout summary
    const checkoutContent = await page.textContent('main');
    expect(checkoutContent).toContain(leftPizzaName);
    expect(checkoutContent).toContain(rightPizzaName);
  });

  test('order tracking page shows half-half selection names after placing order', async ({ page }) => {
    test.setTimeout(60000);

    const { leftPizzaName, rightPizzaName } = await addHalfHalfToCart(page);
    await goToCart(page);

    // Go to checkout
    await page.locator('button:has-text("Checkout")').click();
    await page.waitForURL('**/checkout', { timeout: 10000 });
    await page.waitForTimeout(1500);

    // Fill checkout form — wait for hotel options to load
    const hotelSelect = page.locator('[data-testid="hotel-select"]');
    await expect(hotelSelect.locator('option')).not.toHaveCount(1, { timeout: 10000 });
    await hotelSelect.selectOption({ index: 1 });
    await page.locator('[data-testid="room-number"]').fill('202');
    await page.locator('input[placeholder*="ID"]').first().fill('test_hh_user');

    // Place order
    await page.locator('[data-testid="place-order"]').click();

    // Wait for order tracking page — use order number in the card (visible on both mobile/desktop)
    await page.waitForURL('**/order/**', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Verify half-half pizza names are displayed on tracking page
    const trackingContent = await page.textContent('main');
    expect(trackingContent).toContain(leftPizzaName);
    expect(trackingContent).toContain(rightPizzaName);
  });
});
