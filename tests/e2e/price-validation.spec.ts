import { test, expect } from '@playwright/test';

const EXPECTED_PIZZA_PRICES: Record<string, string> = {
  'Cheese': '₩19,900 / ₩23,900',
  'Flower Pepperoni': '₩20,900 / ₩24,900',
  'Super Combination': '₩20,900 / ₩24,900',
  'Double Cheddar Bacon': '₩20,900 / ₩24,900',
  'Bulgogi': '₩21,900 / ₩25,900',
  'Spicy Bulgogi': '₩21,900 / ₩25,900',
  'Sweet Potato': '₩21,900 / ₩25,900',
  'Bacon Potato': '₩21,900 / ₩25,900',
  'Mega Potato': '₩22,900 / ₩26,900',
  'Hawaiian': '₩21,900 / ₩25,900',
  'Bacon Shrimp': '₩22,900 / ₩26,900',
  'Hot Chicken': '₩20,900 / ₩24,900',
  'Hot Chicken Shrimp': '₩22,900 / ₩26,900',
  'Cream Buldak': '₩22,900 / ₩26,900',
  'Cheddar Bulgalbi': '₩22,900 / ₩26,900',
};

const EXPECTED_SIDE_PRICES: Record<string, string> = {
  'Meat Oven Spaghetti': '₩6,500',
  'Carbonara': '₩7,000',
  'Cream Buldak Spaghetti': '₩7,500',
  'Bulgogi Spaghetti': '₩7,500',
  'Buffalo Wings (5pcs)': '₩5,900',
  'Buffalo Wings (10pcs)': '₩10,900',
  'Side Combo': '₩13,900',
  'Chicken Tenders (4pcs)': '₩5,000',
  'Shrimp Rings (8pcs)': '₩6,000',
  'Smoked Chicken (Half)': '₩6,900',
  'Smoked Chicken (Whole)': '₩12,900',
};

const EXPECTED_DRINK_PRICES: Record<string, string> = {
  'Coca-Cola 500ml': '₩2,000',
  'Coca-Cola Zero 500ml': '₩2,000',
  'Sprite 500ml': '₩2,000',
  'Coca-Cola 1.25L': '₩4,000',
  'Coca-Cola Zero 1.25L': '₩4,000',
  'Sprite 1.5L': '₩4,000',
};

const EXPECTED_SAUCE_PRICES: Record<string, string> = {
  'Pickles': '₩500',
  'Garlic Sauce': '₩300',
  'Hot Sauce': '₩100',
  'Parmesan Cheese': '₩300',
  'Jalapeño': '₩700',
};

test.describe('Price Validation', () => {
  test('all pizza prices match expected values', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Signature Pizzas/i }).click();
    await page.waitForTimeout(1000);

    // Get all menu card price texts
    const priceElements = page.locator('.text-pizza-red.font-bold');
    const count = await priceElements.count();

    expect(count).toBeGreaterThanOrEqual(15);

    for (const [name, expectedPrice] of Object.entries(EXPECTED_PIZZA_PRICES)) {
      const card = page.locator('[role="button"]').filter({ hasText: name });
      const cardCount = await card.count();
      if (cardCount > 0) {
        const priceText = await card.first().locator('.text-pizza-red').textContent();
        expect(priceText?.trim()).toBe(expectedPrice);
      }
    }
  });

  test('all side prices match expected values', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /^Sides$/i }).click();
    await page.waitForTimeout(1000);

    for (const [name, expectedPrice] of Object.entries(EXPECTED_SIDE_PRICES)) {
      const card = page.locator('[role="button"]').filter({ hasText: name });
      const cardCount = await card.count();
      if (cardCount > 0) {
        const priceText = await card.first().locator('.text-pizza-red').textContent();
        expect(priceText?.trim()).toBe(expectedPrice);
      }
    }
  });

  test('all drink prices match expected values', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Drinks/i }).click();
    await page.waitForTimeout(1000);

    for (const [name, expectedPrice] of Object.entries(EXPECTED_DRINK_PRICES)) {
      const card = page.locator('[role="button"]').filter({ hasText: name });
      const cardCount = await card.count();
      if (cardCount > 0) {
        const priceText = await card.first().locator('.text-pizza-red').textContent();
        expect(priceText?.trim()).toBe(expectedPrice);
      }
    }
  });

  test('all sauce prices match expected values', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Sauces/i }).click();
    await page.waitForTimeout(1000);

    for (const [name, expectedPrice] of Object.entries(EXPECTED_SAUCE_PRICES)) {
      const card = page.locator('[role="button"]').filter({ hasText: name });
      const cardCount = await card.count();
      if (cardCount > 0) {
        const priceText = await card.first().locator('.text-pizza-red').textContent();
        expect(priceText?.trim()).toBe(expectedPrice);
      }
    }
  });

  test('half & half prices are correct', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Half.*Half/i }).click();
    await page.waitForTimeout(500);

    // R price
    await expect(page.locator('text=₩22,900')).toBeVisible();
    // L price
    await expect(page.locator('text=₩26,900')).toBeVisible();
  });
});
