import { test, expect } from '@playwright/test';

test.describe('Half & Half Pizza', () => {
  test('select two halves and add to cart', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    // Click Half & Half tab (should be default or first tab)
    await page.getByRole('button', { name: /Half.*Half/i }).click();
    await page.waitForTimeout(500);

    // Click left half area to open picker
    // The left half is a button inside the circle
    const leftHalf = page.locator('button').filter({ hasText: /Tap/ }).first();
    if (await leftHalf.isVisible({ timeout: 2000 }).catch(() => false)) {
      await leftHalf.click();
    } else {
      // Click the left half text button
      await page.getByText('Left Half').click();
    }
    await page.waitForTimeout(500);

    // Pizza grid should be visible — select first pizza
    const pizzaGrid = page.locator('[data-slot="sheet-content"]').last();
    const firstPizza = pizzaGrid.locator('button').filter({ hasText: /Cheese|Bulgogi|Pepperoni/i }).first();
    await firstPizza.click();
    await page.waitForTimeout(500);

    // Click right half
    const rightHalfBtn = page.getByText('Right Half');
    await rightHalfBtn.click();
    await page.waitForTimeout(500);

    // Select second pizza
    const pizzaGrid2 = page.locator('[data-slot="sheet-content"]').last();
    const secondPizza = pizzaGrid2.locator('button').filter({ hasText: /Bulgogi|Hawaiian|Potato/i }).first();
    await secondPizza.click();
    await page.waitForTimeout(500);

    // Verify price is shown (₩22,900 for R)
    await expect(page.locator('text=₩22,900')).toBeVisible();

    // Switch to L size
    await page.getByRole('button', { name: /Large/i }).click();
    await expect(page.locator('text=₩26,900')).toBeVisible();

    // Add to cart
    await page.getByRole('button', { name: /Half.*Half.*₩/i }).click();
    await page.waitForTimeout(1000);

    // Verify cart has item (upsell or cart bar)
    const cartBar = page.locator('text=₩26,900');
    await expect(cartBar).toBeVisible({ timeout: 3000 });
  });
});
