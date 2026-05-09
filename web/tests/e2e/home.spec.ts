import { test, expect } from '@playwright/test';

test('has title and login button', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Vifixa AI/);

  // Check for login button
  const loginBtn = page.getByRole('link', { name: /đăng nhập/i });
  await expect(loginBtn).toBeVisible();
});

test('navigation to register page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /đăng ký/i }).first().click();
  await expect(page).toHaveURL(/.*register/);
});
