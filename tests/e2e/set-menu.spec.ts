import { test, expect } from '@playwright/test';

test.describe('Set Menu', () => {
  test('complete set 1 selection flow', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    // Click Value Sets tab
    await page.getByRole('button', { name: /Value Sets/i }).click();
    await page.waitForTimeout(500);

    // Click Set 1 card
    const set1Card = page.locator('[role="button"]').filter({ hasText: /Set 1/i }).first();
    await set1Card.click();
    await page.waitForTimeout(500);

    // Step indicator should be visible
    await expect(page.locator('text=/Step/i')).toBeVisible({ timeout: 5000 });

    // Select size R
    await page.getByRole('button', { name: /Regular/i }).click();
    await page.waitForTimeout(500);

    // Select a pizza
    const pizzaOption = page.locator('button').filter({ hasText: /Cheese|Bulgogi/i }).first();
    await pizzaOption.click();
    await page.waitForTimeout(500);

    // Select spaghetti
    const spaghettiOption = page.locator('button').filter({ hasText: /Carbonara|Meat/i }).first();
    await spaghettiOption.click();
    await page.waitForTimeout(500);

    // Confirm screen — verify summary
    await expect(page.locator('text=/Your Set|세트/i')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=₩24,900')).toBeVisible();

    // Add to cart
    await page.getByRole('button', { name: /Add to Cart/i }).click();
    await page.waitForTimeout(500);
  });
});
