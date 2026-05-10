import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}))

describe('useFeatureFlag Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns isEnabled true when flag is enabled in DB', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { key: 'test-flag', enabled: true },
      error: null,
    })
    
// @ts-expect-error Mocking supabase client
supabase.from.mockImplementation(() => ({
       select: () => ({
         eq: () => ({
           single: mockSingle,
         }),
       }),
     }))

    const { result } = renderHook(() => useFeatureFlag('test-flag'))

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isEnabled).toBe(true)
    expect(result.current.error).toBe(null)
  })

  it('returns isEnabled false when flag is disabled in DB', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { key: 'test-flag', enabled: false },
      error: null,
    })
    
// @ts-expect-error Mocking supabase client
supabase.from.mockImplementation(() => ({
       select: () => ({
         eq: () => ({
           single: mockSingle,
         }),
       }),
     }))

    const { result } = renderHook(() => useFeatureFlag('test-flag'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isEnabled).toBe(false)
  })

  it('handles "not found" error by defaulting to disabled', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    })
    
// @ts-expect-error Mocking supabase client
supabase.from.mockImplementation(() => ({
       select: () => ({
         eq: () => ({
           single: mockSingle,
         }),
       }),
     }))

    const { result } = renderHook(() => useFeatureFlag('non-existent'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isEnabled).toBe(false)
    expect(result.current.error).toBe(null)
  })
})
