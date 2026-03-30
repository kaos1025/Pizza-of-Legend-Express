import { test, expect } from '@playwright/test';

test.describe('Half & Half Pizza', () => {
  test('select two halves and add to cart', async ({ page }) => {
    // Fresh start
    await page.goto('/en');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    // Half & Half tab
    await page.locator('[data-testid="tab-half_half"]').click();
    await page.waitForTimeout(1000);

    // Click left half circle area to open picker
    await page.locator('[data-testid="half-left"]').click();
    await page.waitForTimeout(1000);

    // Select first pizza in the picker sheet
    await page.locator('.aspect-square').first().click();
    await page.waitForTimeout(1000);

    // Click right half circle area
    await page.locator('[data-testid="half-right"]').click();
    await page.waitForTimeout(1000);

    // Select a different pizza (3rd one)
    await page.locator('.aspect-square').nth(2).click();
    await page.waitForTimeout(1000);

    // Verify R price in size button
    await expect(page.locator('[data-testid="hh-size-R"]')).toContainText('₩25,900');

    // Switch to L
    await page.locator('[data-testid="hh-size-L"]').click();
    await expect(page.locator('[data-testid="hh-size-L"]')).toContainText('₩29,900');

    // Add to cart
    await page.locator('[data-testid="hh-add-to-cart"]').click();
    await page.waitForTimeout(1500);

    // Upsell sheet should appear with "Added!"
    await expect(page.locator('text=Added')).toBeVisible({ timeout: 3000 });
  });
});
