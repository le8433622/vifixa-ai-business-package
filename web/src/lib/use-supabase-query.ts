'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseMutationOptions } from '@tanstack/react-query'

type SupabaseQueryResult<T> = { data: T | null; error: unknown }
type SupabaseMutateResult<T> = { data: T | null; error: unknown }

function extractError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) return (err as { message: string }).message
  return 'Unknown error'
}

export function useSupabaseQuery<TData>(
  queryKey: string[],
  queryFn: () => Promise<SupabaseQueryResult<TData>>,
  options?: { enabled?: boolean; staleTime?: number }
) {
  return useQuery<TData, string>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await queryFn()
      if (error) throw extractError(error)
      if (data === null) throw new Error('No data returned')
      return data as TData
    },
    enabled: options?.enabled,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
  })
}

export function useSupabaseMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<SupabaseMutateResult<TData>>,
  options?: Omit<UseMutationOptions<TData, string, TVariables, unknown>, 'mutationFn'>
) {
  return useMutation<TData, string, TVariables>({
    ...options,
    mutationFn: async (variables: TVariables) => {
      const { data, error } = await mutationFn(variables)
      if (error) throw extractError(error)
      if (data === null) throw new Error('No data returned')
      return data as TData
    },
  })
}

export function useSupabaseQueryInvalidate() {
  const queryClient = useQueryClient()
  return (queryKey: string[]) => queryClient.invalidateQueries({ queryKey })
}
