import { test, expect } from '@playwright/test';

// Set menus are disabled per client feedback — these tests are skipped until restored
test.describe('Set Menu', () => {
  test.skip('set menu cards display with correct prices', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="tab-set_menu"]').click();
    await page.waitForTimeout(1000);

    const cards = page.locator('[data-testid^="menu-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    await expect(cards.filter({ hasText: /Solo/i }).first()).toContainText('₩18,900');
    await expect(cards.filter({ hasText: /Set 1/i }).first()).toContainText('₩24,900');
  });

  test.skip('set menu opens step wizard on click', async ({ page }) => {
    await page.goto('/en');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto('/en');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await page.locator('[data-testid="tab-set_menu"]').click();
    await page.waitForTimeout(1000);

    await page.locator('[data-testid^="menu-card"]').filter({ hasText: /Solo/i }).first().click();
    await page.waitForTimeout(1000);

    await expect(page.locator('text=/Choose your pizza|Step 1/i')).toBeVisible({ timeout: 5000 });
  });
});
