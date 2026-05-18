import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { CurrencyProvider, useCurrency } from '../CurrencyProvider'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => Promise.resolve({ data: null, error: null }),
    }),
  },
}))

function wrapper({ children }: { children: ReactNode }) {
  return <CurrencyProvider>{children}</CurrencyProvider>
}

describe('useCurrency', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to VND', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper })
    await waitFor(() => expect(result.current.currency).toBe('VND'))
  })

  it('converts VND to USD after switching currency', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper })
    act(() => result.current.setCurrency('USD'))
    await waitFor(() => {
      const converted = result.current.convert(25450)
      expect(converted).toBeCloseTo(1, -1)
    })
  })

  it('formats VND price', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper })
    await waitFor(() => {
      const formatted = result.current.format(99000)
      expect(formatted).toContain('₫')
    })
  })

  it('changes currency and persists to localStorage', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper })
    await waitFor(() => expect(result.current.currency).toBe('VND'))
    act(() => result.current.setCurrency('USD'))
    expect(result.current.currency).toBe('USD')
    expect(localStorage.getItem('preferred_currency')).toBe('USD')
  })

  it('reads persisted currency from localStorage', async () => {
    localStorage.setItem('preferred_currency', 'THB')
    const { result } = renderHook(() => useCurrency(), { wrapper })
    await waitFor(() => expect(result.current.currency).toBe('THB'))
  })

  it('provides four available currencies', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper })
    await waitFor(() => {
      expect(result.current.availableCurrencies).toEqual(['VND', 'USD', 'THB', 'IDR'])
    })
  })
})
