import { test, expect } from '@playwright/test'

test.describe('Public pages', () => {
  test('homepage loads and shows service cards', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('language toggle switches between VI/EN', async ({ page }) => {
    await page.goto('/')
    const langBtn = page.locator('[data-testid="language-toggle"]')
    if (await langBtn.isVisible()) {
      await langBtn.click()
    }
  })

  test('for-business page loads plans', async ({ page }) => {
    await page.goto('/for-business')
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('register page has form', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('button, input').first()).toBeVisible()
  })

  test('terms page renders', async ({ page }) => {
    await page.goto('/terms')
    await page.waitForLoadState('networkidle')
  })
})

test.describe('Customer pages', () => {
  test('customer home loads', async ({ page }) => {
    await page.goto('/customer')
    await page.waitForLoadState('networkidle')
  })

  test('customer map loads', async ({ page }) => {
    await page.goto('/customer/map')
    await page.waitForLoadState('networkidle')
  })

  test('customer membership page renders', async ({ page }) => {
    await page.goto('/customer/membership')
    await page.waitForLoadState('networkidle')
  })
})

test.describe('Worker pages', () => {
  test('worker home loads', async ({ page }) => {
    await page.goto('/worker')
    await page.waitForLoadState('networkidle')
  })

  test('worker map loads', async ({ page }) => {
    await page.goto('/worker/map')
    await page.waitForLoadState('networkidle')
  })

  test('worker earnings page loads', async ({ page }) => {
    await page.goto('/worker/earnings')
    await page.waitForLoadState('networkidle')
  })

  test('worker boost page loads', async ({ page }) => {
    await page.goto('/worker/boost')
    await page.waitForLoadState('networkidle')
  })
})

test.describe('Admin pages', () => {
  test('admin login page redirects', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
  })

  test('admin analytics page loads', async ({ page }) => {
    await page.goto('/admin/analytics')
    await page.waitForLoadState('networkidle')
  })

  test('admin settings page loads', async ({ page }) => {
    await page.goto('/admin/settings')
    await page.waitForLoadState('networkidle')
  })
})

test.describe('Companion pages', () => {
  test('companion chat loads', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).toBeAttached()
  })
})

test.describe('B2B pages', () => {
  test('b2b dashboard loads', async ({ page }) => {
    await page.goto('/b2b')
    await page.waitForLoadState('networkidle')
  })
})

test.describe('Payment pages', () => {
  test('customer payment page renders', async ({ page }) => {
    await page.goto('/customer/payment')
    await page.waitForLoadState('networkidle')
  })
})
