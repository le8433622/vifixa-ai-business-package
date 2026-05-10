import { test, expect } from '@playwright/test';

test.describe('Admin routes', () => {
  test('admin settings index renders', async ({ page }) => {
    await page.goto('/admin/settings');
    await expect(page.locator('h1').filter({ hasText: /cài đặt|settings/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('admin features page title renders', async ({ page }) => {
    await page.goto('/admin/settings/features');
    await expect(page.locator('h1').filter({ hasText: /feature|tính năng/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('admin security page title renders', async ({ page }) => {
    await page.goto('/admin/settings/security');
    await expect(page.locator('h1').filter({ hasText: /security|bảo mật/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('admin general settings page title renders', async ({ page }) => {
    await page.goto('/admin/settings/general');
    await expect(page.locator('h1').filter({ hasText: /general|chung/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('admin notifications page title renders', async ({ page }) => {
    await page.goto('/admin/settings/notifications');
    await expect(page.locator('h1').filter({ hasText: /notification|thông báo/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('admin wallet page title renders', async ({ page }) => {
    await page.goto('/admin/settings/wallet');
    await expect(page.locator('h1').filter({ hasText: /wallet|billing|ví/i }).first()).toBeVisible({ timeout: 10000 });
  });
});