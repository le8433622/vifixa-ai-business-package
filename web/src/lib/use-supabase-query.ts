'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseMutationOptions, QueryKey } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type SupabaseQueryResult<Data> = { data: Data | null; error: unknown }
type MutationResult<TData = unknown> = TData | null

function extractError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return (err as { message: string }).message
  }
  return 'Unknown error'
}

export function useSupabaseQuery<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<MutationResult<T>>,
  options?: { enabled?: boolean; staleTime?: number }
) {
  return useQuery<MutationResult<T>, string>({
    queryKey,
    queryFn: async () => {
      const result = await queryFn()
      if (result === null) throw new Error('No data returned')
      return result
    },
    enabled: options?.enabled,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
  })
}

export function useSupabaseMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<MutationResult<TData>>,
  options?: Omit<UseMutationOptions<TData, string, TVariables, unknown>, 'mutationFn'>
) {
  return useMutation<TData, string, TVariables>({
    ...options,
    mutationFn: async (variables: TVariables) => {
      const result = await mutationFn(variables)
      if (result === null) throw new Error('No data returned')
      return result
    },
  })
}

export function useSupabaseClient() {
  return createClientComponentClient()
}

export function useSupabaseInvalidateQuery() {
  const queryClient = useQueryClient()
  
  const invalidate = (queryKey: QueryKey) => queryClient.invalidateQueries({ queryKey })
  
  return invalidate
}
