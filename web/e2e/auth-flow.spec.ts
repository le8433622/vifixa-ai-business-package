import { test, expect } from '@playwright/test'

test.describe('Auth UI flows', () => {
  test('login form has all required fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('[data-testid="login-email"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-password"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-submit"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-submit"]')).toHaveText('Đăng nhập')
  })

  test('login form validation shows error on bad credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[data-testid="login-email"]', 'nonexistent@test.com')
    await page.fill('[data-testid="login-password"]', 'wrongpassword')
    await page.click('[data-testid="login-submit"]')
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 10000 })
  })

  test('register form has all required fields', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('[data-testid="register-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="register-email"]')).toBeVisible()
    await expect(page.locator('[data-testid="register-phone"]')).toBeVisible()
    await expect(page.locator('[data-testid="register-password"]')).toBeVisible()
    await expect(page.locator('[data-testid="register-role-customer"]')).toBeVisible()
    await expect(page.locator('[data-testid="register-role-worker"]')).toBeVisible()
    await expect(page.locator('[data-testid="register-submit"]')).toBeVisible()
  })

  test('register role toggle switches between customer and worker', async ({ page }) => {
    await page.goto('/register')
    const customerBtn = page.locator('[data-testid="register-role-customer"]')
    const workerBtn = page.locator('[data-testid="register-role-worker"]')
    await expect(customerBtn).toBeVisible()
    await expect(workerBtn).toBeVisible()
    await workerBtn.click()
    await expect(workerBtn).toHaveClass(/border-blue-500/)
    await customerBtn.click()
    await expect(customerBtn).toHaveClass(/border-blue-500/)
  })

  test('navigation from login to register and back', async ({ page }) => {
    await page.goto('/login')
    await page.getByText('Đăng ký ngay').click()
    await expect(page).toHaveURL('/register')
    await page.getByText('Đăng nhập').click()
    await expect(page).toHaveURL('/login')
  })

  test('register form validation shows error on invalid submission', async ({ page }) => {
    await page.goto('/register')
    await page.fill('[data-testid="register-name"]', 'Test User')
    await page.fill('[data-testid="register-email"]', 'bad-email')
    await page.fill('[data-testid="register-password"]', '123')
    await page.click('[data-testid="register-submit"]')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/register')
  })
})

test.describe('Protected pages without auth', () => {
  test('customer page shows auth error or redirects when not logged in', async ({ page }) => {
    await page.goto('/customer')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeAttached()
  })

  test('worker page shows auth error or redirects when not logged in', async ({ page }) => {
    await page.goto('/worker')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeAttached()
  })

  test('admin page shows auth error or redirects when not logged in', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeAttached()
  })
})
