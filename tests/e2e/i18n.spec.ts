import { test, expect } from '@playwright/test';

test.describe('Internationalization', () => {
  test('switch to Chinese', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="lang-zh"]').click();
    await page.waitForURL('**/zh**', { timeout: 5000 });

    await expect(page.locator('text=传奇披萨')).toBeVisible({ timeout: 5000 });
  });

  test('switch to Japanese', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="lang-ja"]').click();
    await page.waitForURL('**/ja**', { timeout: 5000 });

    await expect(page.locator('text=伝説のピザ')).toBeVisible({ timeout: 5000 });
  });

  test('cart persists across language switch', async ({ page }) => {
    await page.goto('/en');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Add pizza
    await page.locator('[data-testid="tab-pizza"]').click();
    await page.waitForTimeout(800);
    await page.locator('[data-testid^="menu-card"]').first().click();
    await page.waitForTimeout(800);
    await page.locator('[data-testid="add-to-cart"]').click();
    await page.waitForTimeout(1500);

    // Close upsell
    const closeBtn = page.locator('[data-slot="sheet-close"]');
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }

    // Switch to Chinese
    await page.locator('[data-testid="lang-zh"]').click();
    await page.waitForURL('**/zh**', { timeout: 5000 });
    await page.waitForTimeout(800);

    // Cart bar should still be visible
    await expect(page.locator('[data-testid="view-cart"]')).toBeVisible({ timeout: 5000 });
  });
});
