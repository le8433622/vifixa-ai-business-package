import { assertEquals, assert } from 'https://deno.land/std/testing/asserts.ts'
import { shouldSearch, extractSearchQuery, formatSearchResults, type SearchResult } from './web-search.ts'

Deno.test('[VIFIXA_TEST] web-search: shouldSearch detects search intent', () => {
  const testCases = [
    { input: 'Tìm giúp tôi giá máy lạnh', expected: true },
    { input: 'Máy lạnh nhà tôi không mát', expected: false },
    { input: 'Google giá tủ lạnh bao nhiêu', expected: true },
    { input: 'Cần thợ sửa gấp', expected: false },
  ]
  for (const tc of testCases) {
    assertEquals(shouldSearch(tc.input), tc.expected, `"${tc.input}" should search=${tc.expected}`)
  }
  console.log('[VIFIXA_TEST] OK: shouldSearch correctly detects', testCases.filter(t => t.expected).length, 'search intents')
})

Deno.test('[VIFIXA_TEST] web-search: extractSearchQuery removes prefixes', () => {
  assertEquals(extractSearchQuery('tìm giá máy lạnh'), 'giá máy lạnh')
  assertEquals(extractSearchQuery('search máy lạnh inverter'), 'máy lạnh inverter')
  assertEquals(extractSearchQuery('cho tôi biết thời tiết hôm nay'), 'thời tiết hôm nay')
  assertEquals(extractSearchQuery('máy lạnh không mát'), 'máy lạnh không mát') // no change
  console.log('[VIFIXA_TEST] OK: extractSearchQuery removes prefixes correctly')
})

Deno.test('[VIFIXA_TEST] web-search: formatSearchResults returns formatted string', () => {
  const results: SearchResult[] = [
    { title: 'Kết quả 1', url: 'https://example.com/1', snippet: 'Đây là kết quả tìm kiếm thứ nhất', source: 'DuckDuckGo' },
    { title: 'Kết quả 2', url: 'https://example.com/2', snippet: 'Đây là kết quả tìm kiếm thứ hai', source: 'DuckDuckGo' },
  ]
  const formatted = formatSearchResults(results)
  assert(formatted.includes('Kết quả 1'))
  assert(formatted.includes('Kết quả 2'))
  assert(formatted.includes('TRA CỨU INTERNET'))
  console.log('[VIFIXA_TEST] OK: formatSearchResults formats', results.length, 'results')
})
