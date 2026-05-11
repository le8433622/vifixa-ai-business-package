import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSupabaseQuery, useSupabaseMutation, useSupabaseInvalidateQuery } from '@/lib/use-supabase-query'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useSupabaseQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns data when query succeeds', async () => {
    const mockData = { items: [{ id: '1', label: 'Test' }] }
    const queryFn = vi.fn().mockResolvedValue(mockData)

    const { result } = renderHook(
      () => useSupabaseQuery(['test-key'], queryFn),
      { wrapper: createWrapper() }
    )

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      await vi.waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })

    expect(result.current.data).toEqual(mockData)
    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it('handles query error', async () => {
    const queryFn = vi.fn().mockRejectedValue(new Error('Database connection failed'))

    const { result } = renderHook(
      () => useSupabaseQuery(['error-key'], queryFn),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      await vi.waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })

    expect(result.current.error?.message).toBe('Database connection failed')
  })

  it('handles null data as error', async () => {
    const queryFn = vi.fn().mockResolvedValue(null)

    const { result } = renderHook(
      () => useSupabaseQuery(['null-key'], queryFn),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      await vi.waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })

    expect(result.current.error?.message).toBe('No data returned')
  })

  it('respects enabled option when false', () => {
    const queryFn = vi.fn()

    const { result } = renderHook(
      () => useSupabaseQuery(['disabled-key'], queryFn, { enabled: false }),
      { wrapper: createWrapper() }
    )

    expect(result.current.isPending).toBe(true)
    expect(queryFn).not.toHaveBeenCalled()
  })
})

describe('useSupabaseMutation', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient()
    vi.clearAllMocks()
  })

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  it('executes mutation successfully', async () => {
    const mockData = { id: 'new-id', status: 'created' }
    const mutationFn = vi.fn().mockResolvedValue(mockData)

    const { result } = renderHook(
      () => useSupabaseMutation(mutationFn),
      { wrapper: Wrapper }
    )

    const data = await result.current.mutateAsync(undefined)

    expect(data).toEqual(mockData)
    expect(mutationFn).toHaveBeenCalledTimes(1)
  })

  it('handles mutation error', async () => {
    const mutationFn = vi.fn().mockRejectedValue('Permission denied')

    const { result } = renderHook(
      () => useSupabaseMutation(mutationFn),
      { wrapper: Wrapper }
    )

    await expect(result.current.mutateAsync(undefined)).rejects.toBe('Permission denied')
  })
})

describe('useSupabaseInvalidateQuery', () => {
  it('returns an invalidate function', () => {
    const { result } = renderHook(
      () => useSupabaseInvalidateQuery(),
      { wrapper: createWrapper() }
    )

    expect(typeof result.current).toBe('function')
  })
})