import { describe, it, expect } from '@jest/globals'
import { formatPrice } from '../../src/lib/customerConstants'

describe('formatPrice', () => {
  it('formats positive price in VND', () => {
    const result = formatPrice(99000)
    expect(result).toContain('99')
    expect(result).toContain('₫')
  })

  it('handles zero price', () => {
    expect(formatPrice(0)).toBeTruthy()
  })

  it('returns fallback for null/undefined', () => {
    expect(formatPrice(null)).toBe('Chưa có giá')
    expect(formatPrice(undefined)).toBe('Chưa có giá')
  })
})
