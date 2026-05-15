import { assertEquals, assertExists, assert } from 'https://deno.land/std/testing/asserts.ts'
import { serviceRegistry, formatPrice } from './service-registry.ts'

Deno.test('[VIFIXA_TEST] service-registry: repair service is registered', () => {
  const repair = serviceRegistry.get('repair')
  assertExists(repair, 'Repair service should exist')
  assertEquals(repair.id, 'repair')
  assertEquals(repair.icon, '🔧')
  assertEquals(repair.keywords.length > 3, true, 'Should have many keywords')
  console.log('[VIFIXA_TEST] OK: Repair service registered with', repair.keywords.length, 'keywords')
})

Deno.test('[VIFIXA_TEST] service-registry: detect works for various inputs', () => {
  const testCases = [
    { input: 'Máy lạnh nhà tôi không mát', expectedMatch: true },
    { input: 'Hello, how are you?', expectedMatch: false },
    { input: 'Cần sửa ống nước bị rò rỉ', expectedMatch: true },
    { input: 'Tôi muốn đặt đồ ăn', expectedMatch: false },
  ]
  for (const tc of testCases) {
    const results = serviceRegistry.detect(tc.input)
    assertEquals(results.length > 0, tc.expectedMatch, `"${tc.input}" should match=${tc.expectedMatch}`)
  }
  console.log('[VIFIXA_TEST] OK: Service detection works correctly')
})

Deno.test('[VIFIXA_TEST] service-registry: getAll returns services', () => {
  const all = serviceRegistry.getAll()
  assert(all.length > 0, 'Should have at least 1 service')
  console.log('[VIFIXA_TEST] OK: getAll returns', all.length, 'services')
})

Deno.test('[VIFIXA_TEST] service-registry: formatPrice works', () => {
  assertEquals(formatPrice(150000, 'VND'), '150.000₫')
  assertEquals(formatPrice(500, 'USD'), '$500')
  console.log('[VIFIXA_TEST] OK: formatPrice formats correctly')
})
