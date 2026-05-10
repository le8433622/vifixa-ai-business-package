import { test, expect } from '@playwright/test';

test('login page renders form', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('h1, h2').filter({ hasText: /đăng nhập|login/i }).first()).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/mật khẩu|password/i)).toBeVisible();
});

test('login page has link to register', async ({ page }) => {
  await page.goto('/login');
  const registerLink = page.getByRole('link', { name: /đăng ký|register/i });
  await expect(registerLink).toBeVisible();
});

test('login page shows validation on empty form', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /đăng nhập|login/i }).click();
  await expect(page.getByText(/vui lòng|required|không được|empty/i).first()).toBeVisible();
});