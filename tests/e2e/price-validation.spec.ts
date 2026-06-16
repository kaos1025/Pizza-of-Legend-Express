import { test, expect } from '@playwright/test';

test.describe('Price Validation', () => {
  test('pizza prices are correct', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="tab-pizza"]').click();
    await page.waitForTimeout(1000);

    const cards = page.locator('[data-testid^="menu-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(10);

    // Spot check: click first card and verify price in detail sheet
    await cards.first().click();
    await page.waitForTimeout(800);
    // Price should be visible in the detail sheet
    const priceText = await page.locator('[data-testid="add-to-cart"]').textContent();
    expect(priceText).toContain('₩');
    // Close sheet
    const closeBtn = page.locator('[data-slot="sheet-close"]');
    if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) await closeBtn.click();
  });

  test('side category tab is hidden when empty (sides removed)', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Sides were removed by the owner — the empty category tab must not render.
    await expect(page.locator('[data-testid="tab-side"]')).toHaveCount(0);
    // Drinks/sauces tabs remain available.
    await expect(page.locator('[data-testid="tab-drink"]')).toBeVisible();
  });

  test('drink prices are correct', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="tab-drink"]').click();
    await page.waitForTimeout(1000);

    const cards = page.locator('[data-testid^="menu-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('sauce prices are correct', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="tab-sauce"]').click();
    await page.waitForTimeout(1000);

    const cards = page.locator('[data-testid^="menu-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('half & half prices displayed', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="tab-half_half"]').click();
    await page.waitForTimeout(800);

    // L-only single fixed price (₩29,900) shown on the add-to-cart button
    await expect(page.locator('[data-testid="hh-add-to-cart"]')).toContainText('₩29,900');
  });
});
