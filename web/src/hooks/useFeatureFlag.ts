// React hooks for Feature Flags
// Provides client-side feature flag checking

'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { FeatureFlag, FeatureCategory, FeatureFlagContextType } from '@/types/featureFlags'

interface UseFeatureFlagReturn {
  isEnabled: boolean
  loading: boolean
  error: string | null
  flag?: FeatureFlag
}

export function useFeatureFlag(key: string): UseFeatureFlagReturn {
  const [isEnabled, setIsEnabled] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [flag, setFlag] = useState<FeatureFlag>()

  const fetchFlag = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('feature_flags')
        .select('key, enabled, requires_config, config_completed, label, description, category')
        .eq('key', key)
        .single()

      if (fetchError) {
        // Flag doesn't exist → default to false
        if (fetchError.code === 'PGRST116') {
          setIsEnabled(false)
          setFlag(undefined)
        } else {
          throw fetchError
        }
      } else if (data as any) {
        const flagData = data as any
        setIsEnabled(flagData.enabled)
        setFlag(flagData as FeatureFlag)
      } else {
        // Should not happen, but safe default
        setIsEnabled(false)
        setFlag(undefined)
      }
    } catch (err: any) {
      console.error(`Error fetching feature flag '${key}':`, err)
      setError(err.message || 'Failed to fetch feature flag')
      setIsEnabled(false) // Safe default
    } finally {
      setLoading(false)
    }
  }, [key])

  useEffect(() => {
    fetchFlag()
  }, [fetchFlag])

  return { isEnabled, loading, error, flag }
}

// Hook to get all flags (for admin)
export function useAllFeatureFlags(category?: FeatureCategory) {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('feature_flags')
        .select('*')
        .order('category', { ascending: true })
        .order('label', { ascending: true })

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setFlags(data || [])
    } catch (err: any) {
      console.error('Error fetching feature flags:', err)
      setError(err.message || 'Failed to fetch flags')
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    fetchFlags()
  }, [fetchFlags])

  return { flags, loading, error, refetch: fetchFlags }
}

// Hook to toggle flag (admin only)
export function useToggleFeatureFlag() {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const toggleFlag = async (key: string, enabled: boolean): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/feature-flag`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ key, enabled }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to toggle flag')
      }

      return true
    } catch (err: any) {
      console.error('Error toggling feature flag:', err)
      setError(err.message || 'Failed to toggle flag')
      return false
    } finally {
      setLoading(false)
    }
  }

  return { toggleFlag, loading, error }
}
