import { test, expect } from '@playwright/test';

const PIN = process.env.ADMIN_PIN || '1234';

async function loginAdmin(page: import('@playwright/test').Page) {
  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');
  for (const d of PIN) {
    await page.locator(`[data-testid="pin-${d}"]`).click();
    await page.waitForTimeout(200);
  }
  await page.waitForURL(/\/admin/, { timeout: 10000 });
}

test.describe('Admin', () => {
  test('shows login screen', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL('**/admin/login', { timeout: 5000 });
    await expect(page.locator('text=Pizza of Legend')).toBeVisible();
    await expect(page.locator('text=Admin Access')).toBeVisible();
  });

  test('wrong PIN shows error', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');

    for (const d of '0000') {
      await page.locator(`[data-testid="pin-${d}"]`).click();
      await page.waitForTimeout(200);
    }

    await expect(page.locator('text=잘못된 PIN')).toBeVisible({ timeout: 5000 });
  });

  test('correct PIN accesses dashboard', async ({ page }) => {
    await loginAdmin(page);
    await expect(page.locator('text=피자오브레전드')).toBeVisible({ timeout: 5000 });
  });

  test('menu management tab', async ({ page }) => {
    await loginAdmin(page);

    // Click menu tab
    await page.locator('[data-testid="admin-menu"]').click();
    await page.waitForURL('**/admin/menu', { timeout: 5000 });
    await page.waitForTimeout(1000);

    await expect(page.locator('text=메뉴 관리')).toBeVisible({ timeout: 10000 });
  });
});
