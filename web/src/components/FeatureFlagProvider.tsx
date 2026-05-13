// FeatureFlagProvider - React Context for Feature Flags
// Provides feature flags to the entire app with realtime updates

'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { FeatureFlagContextType } from '@/types/featureFlags'

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined)

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('feature_flags')
        .select('key, enabled')

      if (fetchError) throw fetchError

      // Convert to Record<key, boolean>
      const flagsMap: Record<string, boolean> = {}
      ;(data || []).forEach((flag: { key: string; enabled: boolean }) => {
        flagsMap[flag.key] = flag.enabled
      })

      setFlags(flagsMap)
    } catch (err: unknown) {
      console.error('Error fetching feature flags:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch flags')
      // Safe default: all flags false
      setFlags({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => { fetchFlags() })

    try {
      const channel = supabase
        .channel('feature_flags_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'feature_flags' },
          () => {
            fetchFlags()
          }
        )
        .subscribe()

      return () => {
        try {
          supabase.removeChannel(channel)
        } catch (e) {
          console.warn('Error removing feature flags channel:', e)
        }
      }
    } catch (e) {
      console.warn('Feature flag realtime subscription not available:', e)
    }
  }, [fetchFlags])

  const isEnabled = useCallback((key: string): boolean => {
    return flags[key] ?? false // Default to false if not found
  }, [flags])

  return (
    <FeatureFlagContext.Provider value={{ flags, loading, error, isEnabled, refetch: fetchFlags }}>
      {children}
    </FeatureFlagContext.Provider>
  )
}

export function useFeatureFlags(): FeatureFlagContextType {
  const context = useContext(FeatureFlagContext)
  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagProvider')
  }
  return context
}
