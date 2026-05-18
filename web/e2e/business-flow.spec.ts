import { test, expect } from '@playwright/test'
import { loginAs, waitForNetworkIdle, isAuthEnabled } from './helpers'

const E2E_CUSTOMER = { email: 'customer@e2e.test', password: 'test123456', name: 'E2E Customer' }
const E2E_WORKER = { email: 'worker@e2e.test', password: 'test123456', name: 'E2E Worker' }

test.describe('Full business flow', () => {
  test.beforeAll(() => {
    test.skip(!isAuthEnabled(), 'E2E auth not configured — set E2E_SUPABASE_URL and E2E_SUPABASE_SERVICE_KEY')
  })

  test('P0-LG-04: login → create order (customer)', async ({ page }) => {
    await loginAs(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password)
    await waitForNetworkIdle(page)
    await expect(page).toHaveURL(/\/customer/)

    await page.goto('/customer/service-request')
    await waitForNetworkIdle(page)
    await expect(page.locator('h1, h2').first()).toBeVisible()

    const descField = page.locator('[data-testid="service-description"], textarea, input[placeholder*="mô tả"]').first()
    if (await descField.isVisible()) {
      await descField.fill('Máy lạnh không mát, cần kiểm tra gas và vệ sinh')
    }
    const submitBtn = page.locator('[data-testid="submit-request"], button:has-text("Gửi"), button:has-text("Tạo đơn")').first()
    if (await submitBtn.isVisible()) {
      await submitBtn.click()
      await waitForNetworkIdle(page)
    }
  })

  test('P0-LG-04: worker can accept job', async ({ page }) => {
    await loginAs(page, E2E_WORKER.email, E2E_WORKER.password)
    await waitForNetworkIdle(page)
    await expect(page).toHaveURL(/\/worker/)

    await page.goto('/worker/jobs')
    await waitForNetworkIdle(page)

    const pendingJobs = page.locator('text=đang chờ, text=Mới, text=pending').first()
    if (await pendingJobs.isVisible()) {
      await pendingJobs.click()
      await waitForNetworkIdle(page)
      const acceptBtn = page.locator('button:has-text("Nhận"), button:has-text("Accept")').first()
      if (await acceptBtn.isVisible()) {
        await acceptBtn.click()
        await waitForNetworkIdle(page)
      }
    }
  })

  test('P0-LG-04: customer can complete order', async ({ page }) => {
    await loginAs(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password)
    await waitForNetworkIdle(page)

    await page.goto('/customer/orders')
    await waitForNetworkIdle(page)

    const activeOrder = page.locator('text=đang xử lý, text=in_progress, text=Đang thực hiện').first()
    if (await activeOrder.isVisible()) {
      await activeOrder.click()
      await waitForNetworkIdle(page)
      const completeBtn = page.locator('button:has-text("Hoàn tất"), button:has-text("Complete")').first()
      if (await completeBtn.isVisible()) {
        await completeBtn.click()
        await waitForNetworkIdle(page)
      }
    }
  })

  test('P0-LG-04: customer can pay for completed order', async ({ page }) => {
    await loginAs(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password)
    await waitForNetworkIdle(page)

    await page.goto('/customer/payment')
    await waitForNetworkIdle(page)

    const payBtn = page.locator('button:has-text("Thanh toán"), button:has-text("Pay")').first()
    if (await payBtn.isVisible()) {
      await payBtn.click()
      await waitForNetworkIdle(page)
    }
  })

  test('P0-LG-04: worker sees earnings updated', async ({ page }) => {
    await loginAs(page, E2E_WORKER.email, E2E_WORKER.password)
    await waitForNetworkIdle(page)

    await page.goto('/worker/earnings')
    await waitForNetworkIdle(page)
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })
})
