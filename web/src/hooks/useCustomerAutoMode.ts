'use client'

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface ServiceGoal {
  id: string
  user_id: string
  goal_type: string
  goal_description: string
  service_id: string | null
  status: string
  created_at: string
}

export interface ServicePlan {
  goal_id: string
  steps: Array<{
    action_id: string
    input: Record<string, unknown>
    description: string
    status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting_approval'
    output?: any
    error?: string
  }>
  status: 'planning' | 'awaiting_approval' | 'executing' | 'completed' | 'failed'
}

export function useCustomerAutoMode(userId: string) {
  const [activeGoals, setActiveGoals] = useState<ServiceGoal[]>([])
  const [currentPlan, setCurrentPlan] = useState<ServicePlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userId) fetchActiveGoals()
  }, [userId])

  async function fetchActiveGoals() {
    try {
      const { data, error } = await supabase
        .from('agent_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('persona', 'customer')
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setActiveGoals(data || [])
    } catch (err: any) {
      console.error('Failed to fetch goals:', err)
    }
  }

  const createServiceGoal = useCallback(async (
    goalType: string,
    description: string,
    serviceId?: string,
    context?: Record<string, unknown>
  ) => {
    if (!userId) {
      setError('User not authenticated')
      return null
    }

    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Session expired')
        return null
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-orchestrator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message: description,
            persona: 'customer',
            context: { goal_type: goalType, service_id: serviceId, ...context },
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create service goal')
        return null
      }

      await fetchActiveGoals()
      return data
    } catch (err: any) {
      setError(err.message || 'Unknown error')
      return null
    } finally {
      setLoading(false)
    }
  }, [userId])

  const saveMemory = useCallback(async (key: string, value: string, importance = 2) => {
    if (!userId) return false

    try {
      const { error } = await supabase
        .from('companion_memories')
        .upsert({
          user_id: userId,
          key,
          value,
          category: 'ai_learned',
          importance,
          source: 'auto_mode',
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: ['user_id', 'key'] })

      if (error) throw error
      return true
    } catch (err: any) {
      console.error('Failed to save memory:', err)
      return false
    }
  }, [userId])

  const loadMemories = useCallback(async (category?: string) => {
    if (!userId) return []

    try {
      let query = supabase
        .from('companion_memories')
        .select('*')
        .eq('user_id', userId)
        .order('importance', { ascending: false })
        .limit(50)

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    } catch (err: any) {
      console.error('Failed to load memories:', err)
      return []
    }
  }, [userId])

  const clearActiveGoals = useCallback(() => {
    setActiveGoals([])
    setCurrentPlan(null)
  }, [])

  return {
    activeGoals,
    currentPlan,
    loading,
    error,
    createServiceGoal,
    saveMemory,
    loadMemories,
    clearActiveGoals,
    refreshGoals: fetchActiveGoals,
  }
}
