import { test, expect } from '@playwright/test';

test.describe('Error Cases', () => {
  test('checkout requires hotel selection', async ({ page }) => {
    // Add item to cart first
    await page.goto('/en');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Signature Pizzas/i }).click();
    await page.waitForTimeout(500);
    const pizza = page.locator('[role="button"]').filter({ hasText: /₩/ }).first();
    await pizza.click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Add to Cart/i }).click();
    await page.waitForTimeout(1500);

    // Go to checkout
    await page.goto('/en/checkout');
    await page.waitForLoadState('networkidle');

    // Don't select hotel, just enter room
    await page.getByPlaceholder(/room/i).fill('101');

    // Place Order button should be disabled (no hotel selected)
    const placeOrderBtn = page.getByRole('button', { name: /Place Order/i });
    await expect(placeOrderBtn).toBeDisabled();
  });

  test('checkout requires room number', async ({ page }) => {
    // Add item to cart
    await page.goto('/en');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Signature Pizzas/i }).click();
    await page.waitForTimeout(500);
    const pizza = page.locator('[role="button"]').filter({ hasText: /₩/ }).first();
    await pizza.click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Add to Cart/i }).click();
    await page.waitForTimeout(1500);

    // Go to checkout
    await page.goto('/en/checkout');
    await page.waitForLoadState('networkidle');

    // Select hotel but no room number
    const hotelSelect = page.locator('select');
    await hotelSelect.selectOption({ index: 1 });

    // Place Order should be disabled (no room number)
    const placeOrderBtn = page.getByRole('button', { name: /Place Order/i });
    await expect(placeOrderBtn).toBeDisabled();
  });

  test('room number only accepts digits', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Signature Pizzas/i }).click();
    await page.waitForTimeout(500);
    const pizza = page.locator('[role="button"]').filter({ hasText: /₩/ }).first();
    await pizza.click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Add to Cart/i }).click();
    await page.waitForTimeout(1500);

    await page.goto('/en/checkout');
    await page.waitForLoadState('networkidle');

    // Type letters — should be stripped
    const roomInput = page.getByPlaceholder(/room/i);
    await roomInput.fill('abc123');
    const value = await roomInput.inputValue();
    expect(value).toBe('123'); // Only digits remain
  });
});
