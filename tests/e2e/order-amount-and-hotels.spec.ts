import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for:
 * Fix 1 — Admin order card shows grand total (menu + delivery fee)
 * Fix 2 — Guest house split into 4 buildings in hotel dropdown
 */

const PIN = process.env.ADMIN_PIN || '1234';

// Run all tests serially to avoid rate limiting on order placement
test.describe.configure({ mode: 'serial' });

async function addPizzaToCart(page: Page) {
  await page.goto('/en');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('/en');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  await page.locator('[data-testid="tab-pizza"]').click();
  await page.waitForTimeout(800);
  await page.locator('[data-testid^="menu-card"]').first().click();
  await page.waitForTimeout(800);
  await page.locator('[data-testid="add-to-cart"]').click();
  await page.waitForTimeout(2000);
}

async function goToCheckout(page: Page) {
  const goToCartBtn = page.locator('text=Go to Cart');
  if (await goToCartBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await goToCartBtn.click();
  } else {
    const close = page.locator('[data-slot="sheet-close"]').first();
    if (await close.isVisible({ timeout: 500 }).catch(() => false)) await close.click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="view-cart"]').click();
  }
  await page.waitForURL('**/cart', { timeout: 10000 });
  await page.waitForTimeout(500);
  await page.locator('button:has-text("Checkout")').click();
  await page.waitForURL('**/checkout', { timeout: 10000 });
  await page.waitForTimeout(1500);
}

/** Wait for hotel options to load in the select dropdown */
async function waitForHotelOptions(page: Page) {
  const select = page.locator('[data-testid="hotel-select"]');
  await expect(select).toBeVisible();
  // Wait until there are more options than just the placeholder
  await expect(select.locator('option')).not.toHaveCount(1, { timeout: 10000 });
}

async function loginAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');
  for (const d of PIN) {
    await page.locator(`[data-testid="pin-${d}"]`).click();
    await page.waitForTimeout(200);
  }
  await page.waitForURL(/\/admin/, { timeout: 10000 });
}

// ─── Fix 2: Guest House Hotel Dropdown ───────────────────────────────

test.describe('Guest House Split — Hotel Dropdown', () => {
  test('shows 4 separate guest house options in dropdown', async ({ page }) => {
    await addPizzaToCart(page);
    await goToCheckout(page);
    await waitForHotelOptions(page);

    const select = page.locator('[data-testid="hotel-select"]');
    const options = await select.locator('option').allTextContents();

    // Should have 4 separate guest house entries
    expect(options.some(o => o.includes('No.1'))).toBe(true);
    expect(options.some(o => o.includes('No.2'))).toBe(true);
    expect(options.some(o => o.includes('No.3'))).toBe(true);
    expect(options.some(o => o.includes('No.4'))).toBe(true);

    // Old combined "Guest House & Another Room" (without No.) should NOT appear
    const oldEntry = options.filter(o =>
      o.includes('Guest House') && !o.includes('No.')
    );
    expect(oldEntry.length).toBe(0);
  });

  test('hotel dropdown is sorted correctly', async ({ page }) => {
    await addPizzaToCart(page);
    await goToCheckout(page);
    await waitForHotelOptions(page);

    const select = page.locator('[data-testid="hotel-select"]');
    const options = await select.locator('option').allTextContents();

    // Remove the placeholder option
    const hotelNames = options.filter(o => o !== '' && !o.includes('Choose') && !o.includes('Select'));

    // Expected order — check relative ordering of key entries
    const expectedOrder = [
      'Best Western',
      'Hyatt',
      'Paradise',
      'Grand Hyatt',
      'HUE',
      'No.1',
      'No.2',
      'No.3',
      'No.4',
    ];

    let lastIndex = -1;
    for (const expected of expectedOrder) {
      const idx = hotelNames.findIndex(n => n.includes(expected));
      expect(idx, `"${expected}" should be in dropdown`).toBeGreaterThan(-1);
      expect(idx, `"${expected}" should come after previous entry`).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }
  });

  test('can select Guest House No.2 and enable place order', async ({ page }) => {
    await addPizzaToCart(page);
    await goToCheckout(page);
    await waitForHotelOptions(page);

    const select = page.locator('[data-testid="hotel-select"]');

    // Find the Guest House No.2 option
    const options = await select.locator('option').all();
    let gh2Value = '';
    for (const opt of options) {
      const text = await opt.textContent();
      if (text?.includes('No.2')) {
        gh2Value = await opt.getAttribute('value') || '';
        break;
      }
    }
    expect(gh2Value).toBeTruthy();

    await select.selectOption(gh2Value);
    await page.locator('[data-testid="room-number"]').fill('627');
    await page.locator('input[placeholder*="ID"]').first().fill('test_user_gh2');

    // Place order button should be enabled
    await expect(page.locator('[data-testid="place-order"]')).toBeEnabled();
  });
});

// ─── Fix 1: Checkout Total Display ───────────────────────────────────

test.describe('Order Amount — Delivery Fee Display', () => {
  test('checkout shows delivery fee breakdown for delivery order', async ({ page }) => {
    await addPizzaToCart(page);
    await goToCheckout(page);

    // Delivery mode is default — should show subtotal, delivery fee ₩1,000, and total
    await expect(page.locator('text=₩1,000')).toBeVisible();

    // Total should be larger than subtotal (includes delivery fee)
    const subtotalEl = page.locator('text=Subtotal').locator('..').locator('span').last();
    const totalEl = page.locator('text=Total Amount').locator('..').locator('span').last();

    const subtotalText = await subtotalEl.textContent();
    const totalText = await totalEl.textContent();

    const subtotal = parseInt((subtotalText || '0').replace(/[^\d]/g, ''));
    const total = parseInt((totalText || '0').replace(/[^\d]/g, ''));
    expect(total).toBe(subtotal + 1000);
  });

  test('checkout shows FREE delivery for pickup order', async ({ page }) => {
    await addPizzaToCart(page);
    await goToCheckout(page);

    // Switch to pickup
    await page.locator('button:has-text("Pickup")').click();
    await page.waitForTimeout(500);

    // Delivery fee should show "FREE"
    await expect(page.getByText('FREE')).toBeVisible();
  });
});

// ─── Order Placement + Admin Verification ────────────────────────────

test.describe('Order Placement & Admin Display', () => {
  test.setTimeout(60000);

  test('delivery order shows grand total on tracking page', async ({ page }) => {
    await addPizzaToCart(page);
    await goToCheckout(page);
    await waitForHotelOptions(page);

    await page.locator('[data-testid="hotel-select"]').selectOption({ index: 1 });
    await page.locator('[data-testid="room-number"]').fill('101');
    await page.locator('input[placeholder*="ID"]').first().fill('test_tracking');
    await page.locator('[data-testid="place-order"]').click();

    // Wait for order tracking page
    await page.waitForURL('**/order/**', { timeout: 20000 });
    await page.waitForTimeout(2000);

    // Tracking page should show Total
    await expect(page.getByText('Total', { exact: true })).toBeVisible();

    // For delivery orders, should show delivery fee breakdown
    const hasDeliveryFee = await page.getByText('Delivery Fee').isVisible({ timeout: 3000 }).catch(() => false);
    if (hasDeliveryFee) {
      await expect(page.getByText('Subtotal')).toBeVisible();
    }
  });

  test('admin order card shows combined total with delivery fee breakdown', async ({ page }) => {
    // Place a delivery order first
    await addPizzaToCart(page);
    await goToCheckout(page);
    await waitForHotelOptions(page);

    await page.locator('[data-testid="hotel-select"]').selectOption({ index: 1 });
    await page.locator('[data-testid="room-number"]').fill('505');
    await page.locator('input[placeholder*="ID"]').first().fill('admin_test');
    await page.locator('[data-testid="place-order"]').click();
    await page.waitForURL('**/order/**', { timeout: 20000 });
    // Wait for order tracking page to fully render before navigating away
    await expect(page.getByText('Thank you for your order!')).toBeVisible({ timeout: 10000 });

    // Navigate to admin — double-goto to break client-side redirect race on WebKit
    await page.goto('about:blank');
    await page.waitForTimeout(500);
    await loginAdmin(page);
    await page.waitForTimeout(2000);

    // Look for the new price format: "메뉴" and "배달비" in the breakdown
    const menuLabel = page.locator('text=메뉴').first();
    const deliveryLabel = page.locator('text=배달비').first();
    await expect(menuLabel).toBeVisible({ timeout: 5000 });
    await expect(deliveryLabel).toBeVisible({ timeout: 5000 });
  });

  test('guest house No.2 order shows correctly in admin', async ({ page }) => {
    // Place order with Guest House No.2
    await addPizzaToCart(page);
    await goToCheckout(page);
    await waitForHotelOptions(page);

    const select = page.locator('[data-testid="hotel-select"]');
    const options = await select.locator('option').all();
    let gh2Value = '';
    for (const opt of options) {
      const text = await opt.textContent();
      if (text?.includes('No.2')) {
        gh2Value = await opt.getAttribute('value') || '';
        break;
      }
    }
    expect(gh2Value).toBeTruthy();

    await select.selectOption(gh2Value);
    await page.locator('[data-testid="room-number"]').fill('627');
    await page.locator('input[placeholder*="ID"]').first().fill('gh2_admin_test');
    await page.locator('[data-testid="place-order"]').click();
    await page.waitForURL('**/order/**', { timeout: 20000 });
    await expect(page.getByText('Thank you for your order!')).toBeVisible({ timeout: 10000 });

    // Check admin — break redirect race on WebKit
    await page.goto('about:blank');
    await page.waitForTimeout(500);
    await loginAdmin(page);
    await page.waitForTimeout(2000);

    // Should show "No.2" and room "627호"
    await expect(page.locator('text=No.2').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=627호').first()).toBeVisible({ timeout: 5000 });
  });
});
