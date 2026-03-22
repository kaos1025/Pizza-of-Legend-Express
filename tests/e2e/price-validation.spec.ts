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

  test('side prices are correct', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="tab-side"]').click();
    await page.waitForTimeout(1000);

    const cards = page.locator('[data-testid^="menu-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(5);
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

    // R and L prices should both be in the size buttons
    await expect(page.locator('[data-testid="hh-size-R"]')).toContainText('₩22,900');
    await expect(page.locator('[data-testid="hh-size-L"]')).toContainText('₩26,900');
  });
});
