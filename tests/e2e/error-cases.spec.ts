import { test, expect, Page } from '@playwright/test';

test.describe('Error Cases', () => {
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

  test('place order disabled without hotel', async ({ page }) => {
    await addPizzaToCart(page);
    await page.goto('/en/checkout');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Fill room and messenger but leave hotel empty
    await page.locator('[data-testid="room-number"]').fill('101');
    await page.locator('input[placeholder*="ID"]').first().fill('test_user');
    await expect(page.locator('[data-testid="place-order"]')).toBeDisabled();
  });

  test('place order disabled without room', async ({ page }) => {
    await addPizzaToCart(page);
    await page.goto('/en/checkout');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Fill hotel and messenger but leave room empty
    await page.locator('[data-testid="hotel-select"]').selectOption({ index: 1 });
    await page.locator('input[placeholder*="ID"]').first().fill('test_user');
    await expect(page.locator('[data-testid="place-order"]')).toBeDisabled();
  });

  test('place order disabled without messenger ID', async ({ page }) => {
    await addPizzaToCart(page);
    await page.goto('/en/checkout');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Fill hotel and room but leave messenger empty
    await page.locator('[data-testid="hotel-select"]').selectOption({ index: 1 });
    await page.locator('[data-testid="room-number"]').fill('101');
    await expect(page.locator('[data-testid="place-order"]')).toBeDisabled();
  });

  test('room number accepts only digits', async ({ page }) => {
    await addPizzaToCart(page);
    await page.goto('/en/checkout');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const input = page.locator('[data-testid="room-number"]');
    await input.click();
    await input.pressSequentially('abc123xyz', { delay: 50 });
    await page.waitForTimeout(300);
    const value = await input.inputValue();
    expect(value).toBe('123');
  });
});
