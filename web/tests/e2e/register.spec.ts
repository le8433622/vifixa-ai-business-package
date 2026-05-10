import { test, expect } from '@playwright/test';

test('register page has role selection', async ({ page }) => {
  await page.goto('/register');
  await expect(page.locator('h1, h2').filter({ hasText: /đăng ký|register/i }).first()).toBeVisible();
  const roleSelectors = page.locator('input[type="radio"], select[name="role"], button:has-text("customer"), button:has-text("worker")');
  await expect(roleSelectors.first()).toBeVisible();
});

test('register page navigates to login', async ({ page }) => {
  await page.goto('/register');
  const loginLink = page.getByRole('link', { name: /đăng nhập|login/i });
  await expect(loginLink).toBeVisible();
});