import { test, expect } from '@playwright/test';

const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

test.describe('Admin', () => {
  test('shows PIN login screen', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Should redirect to login
    await expect(page).toHaveURL(/\/admin\/login/);

    // Logo and branding should be visible
    await expect(page.locator('text=Pizza of Legend')).toBeVisible();
    await expect(page.locator('text=Admin Access')).toBeVisible();
  });

  test('wrong PIN shows error', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');

    // Enter wrong PIN via keypad
    for (const digit of '0000') {
      await page.getByRole('button', { name: digit, exact: true }).click();
      await page.waitForTimeout(100);
    }

    // Should show error
    await expect(page.locator('text=잘못된 PIN')).toBeVisible({ timeout: 5000 });
  });

  test('correct PIN accesses dashboard', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');

    // Enter correct PIN
    for (const digit of ADMIN_PIN) {
      await page.getByRole('button', { name: digit, exact: true }).click();
      await page.waitForTimeout(100);
    }

    // Should redirect to admin dashboard
    await page.waitForURL('**/admin', { timeout: 10000 });

    // Dashboard elements should be visible
    await expect(page.locator('text=피자오브레전드')).toBeVisible({ timeout: 5000 });

    // Navigation tabs
    await expect(page.locator('text=주문관제')).toBeVisible();
    await expect(page.locator('text=메뉴관리')).toBeVisible();
    await expect(page.locator('text=배달관리')).toBeVisible();
  });

  test('menu management tab shows items', async ({ page }) => {
    // Login first
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    for (const digit of ADMIN_PIN) {
      await page.getByRole('button', { name: digit, exact: true }).click();
      await page.waitForTimeout(100);
    }
    await page.waitForURL('**/admin', { timeout: 10000 });

    // Click menu tab
    await page.getByText('메뉴관리').click();
    await page.waitForURL('**/admin/menu');
    await page.waitForTimeout(1000);

    // Should show menu management UI
    await expect(page.locator('text=메뉴 관리')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /메뉴 추가/i })).toBeVisible();
  });
});
