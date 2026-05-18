import { Page } from '@playwright/test'

export async function loginAs(
  page: Page,
  email: string,
  password: string,
) {
  await page.goto('/login')
  await page.fill('[data-testid="login-email"]', email)
  await page.fill('[data-testid="login-password"]', password)
  await page.click('[data-testid="login-submit"]')
}

export async function waitForNetworkIdle(page: Page) {
  await page.waitForLoadState('networkidle')
}

export function isAuthEnabled(): boolean {
  return !!process.env.E2E_SUPABASE_URL && !!process.env.E2E_SUPABASE_SERVICE_KEY
}
