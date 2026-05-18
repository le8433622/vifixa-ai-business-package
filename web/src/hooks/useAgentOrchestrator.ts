'use client'

import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export interface AgentPlan {
  goal_id: string
  run_id: string
  goal_type: string
  goal_description: string
  service_id: string | null
  plan: Array<{
    action_id: string
    input: Record<string, unknown>
    description: string
  }>
  results: Array<{
    step_index: number
    action_id: string
    status: string
    output?: any
    error?: string
  }>
  status: string
  needs_approval: boolean
}

export interface ApprovalRequest {
  id: string
  step_id: string
  user_id: string
  action_id: string
  action_summary: string
  status: string
  expires_at: string
  created_at: string
}

export function useAgentOrchestrator(userId: string, persona: 'customer' | 'worker' | 'admin') {
  const [currentPlan, setCurrentPlan] = useState<AgentPlan | null>(null)
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [runs, setRuns] = useState<any[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const invoke = useCallback(async (message: string, mediaUrls?: string[]) => {
    if (!userId) {
      setError('User not authenticated')
      return null
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

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
            message,
            persona,
            media_urls: mediaUrls,
          }),
          signal: controller.signal,
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to invoke agent orchestrator')
        return null
      }

      const plan = data as AgentPlan
      setCurrentPlan(plan)

      if (plan.needs_approval) {
        await fetchPendingApprovals()
      }

      return plan
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Unknown error')
      }
      return null
    } finally {
      setLoading(false)
    }
  }, [userId, persona])

  const approveAction = useCallback(async (approvalId: string, reason?: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Session expired')
        return false
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-orchestrator/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            approval_id: approvalId,
            decision: 'approved',
            reason,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to approve action')
        return false
      }

      await fetchPendingApprovals()
      return true
    } catch (err: any) {
      setError(err.message || 'Unknown error')
      return false
    } finally {
      setLoading(false)
    }
  }, [userId])

  const rejectAction = useCallback(async (approvalId: string, reason: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Session expired')
        return false
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-orchestrator/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            approval_id: approvalId,
            decision: 'rejected',
            reason,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to reject action')
        return false
      }

      await fetchPendingApprovals()
      return true
    } catch (err: any) {
      setError(err.message || 'Unknown error')
      return false
    } finally {
      setLoading(false)
    }
  }, [userId])

  const fetchPendingApprovals = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-orchestrator/approvals`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      const data = await response.json()
      if (response.ok) {
        setPendingApprovals(data.approvals || [])
      }
    } catch (err: any) {
      console.error('Failed to fetch approvals:', err)
    }
  }, [userId])

  const fetchRuns = useCallback(async (limit = 10) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-orchestrator/runs?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      const data = await response.json()
      if (response.ok) {
        setRuns(data.runs || [])
      }
    } catch (err: any) {
      console.error('Failed to fetch runs:', err)
    }
  }, [userId])

  const clearPlan = useCallback(() => {
    setCurrentPlan(null)
    setError(null)
  }, [])

  return {
    invoke,
    approveAction,
    rejectAction,
    currentPlan,
    pendingApprovals,
    runs,
    loading,
    error,
    fetchPendingApprovals,
    fetchRuns,
    clearPlan,
  }
}
