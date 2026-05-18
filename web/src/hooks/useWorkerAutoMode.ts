'use client'

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface RankedJob {
  id: string
  customer_id: string
  category: string
  description: string
  estimated_price: number
  status: string
  created_at: string
  customer_location?: { lat: number; lng: number }
  customer_address?: string
  distance_km?: number
  eta_minutes?: number
  match_score: number
  match_reasons: string[]
}

export interface WorkerIncomeStats {
  today: number
  week: number
  month: number
  total: number
  totalJobs: number
  avgPerJob: number
  topCategory: string
  completionRate: number
}

export function useWorkerAutoMode(userId: string) {
  const [rankedJobs, setRankedJobs] = useState<RankedJob[]>([])
  const [incomeStats, setIncomeStats] = useState<WorkerIncomeStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workerSkills, setWorkerSkills] = useState<string[]>([])
  const [workerLocation, setWorkerLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (userId) {
      loadWorkerSkills()
      findAndRankJobs()
      loadIncomeStats()
    }
  }, [userId])

  async function loadWorkerSkills() {
    try {
      const { data } = await supabase
        .from('workers')
        .select('skills')
        .eq('user_id', userId)
        .single()

      if (data?.skills) {
        setWorkerSkills(Array.isArray(data.skills) ? data.skills : [])
      }
    } catch (err: any) {
      console.error('Failed to load worker skills:', err)
    }
  }

  async function findAndRankJobs() {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Session expired')
        return
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
            message: 'Tìm việc phù hợp gần đây',
            persona: 'worker',
            context: {
              goal_type: 'find_jobs',
              skills: workerSkills,
              location: workerLocation,
            },
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to find jobs')
        return
      }

      if (data.results?.[0]?.output?.jobs) {
        setRankedJobs(data.results[0].output.jobs)
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function loadIncomeStats() {
    if (!userId) return

    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const { data: orders, error } = await supabase
        .from('orders')
        .select('status, estimated_price, final_price, category, created_at')
        .eq('worker_id', userId)

      if (error) throw error

      const completed = (orders || []).filter(o => o.status === 'completed')
      const todayOrders = completed.filter(o => o.created_at >= todayStart)
      const weekOrders = completed.filter(o => o.created_at >= weekStart)
      const monthOrders = completed.filter(o => o.created_at >= monthStart)

      const getPrice = (o: any) => o.final_price || o.estimated_price || 0

      const categoryCount: Record<string, number> = {}
      completed.forEach(o => {
        categoryCount[o.category] = (categoryCount[o.category] || 0) + 1
      })
      const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

      const totalOrders = completed.length
      const matchedOrInProgress = (orders || []).filter(o => ['matched', 'in_progress'].includes(o.status)).length
      const completionRate = totalOrders > 0 ? (totalOrders / (totalOrders + matchedOrInProgress)) * 100 : 0

      setIncomeStats({
        today: todayOrders.reduce((s, o) => s + getPrice(o), 0),
        week: weekOrders.reduce((s, o) => s + getPrice(o), 0),
        month: monthOrders.reduce((s, o) => s + getPrice(o), 0),
        total: completed.reduce((s, o) => s + getPrice(o), 0),
        totalJobs: totalOrders,
        avgPerJob: totalOrders > 0 ? completed.reduce((s, o) => s + getPrice(o), 0) / totalOrders : 0,
        topCategory,
        completionRate,
      })
    } catch (err: any) {
      console.error('Failed to load income stats:', err)
    }
  }

  const acceptJob = useCallback(async (jobId: string) => {
    if (!userId) return false

    try {
      setLoading(true)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return false

      const { error } = await supabase
        .from('orders')
        .update({ status: 'in_progress', worker_id: userId })
        .eq('id', jobId)
        .eq('status', 'matched')

      if (error) throw error

      await findAndRankJobs()
      await loadIncomeStats()
      return true
    } catch (err: any) {
      setError(err.message || 'Failed to accept job')
      return false
    } finally {
      setLoading(false)
    }
  }, [userId])

  const completeJob = useCallback(async (jobId: string) => {
    if (!userId) return false

    try {
      setLoading(true)

      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', jobId)
        .eq('worker_id', userId)

      if (error) throw error

      await findAndRankJobs()
      await loadIncomeStats()
      return true
    } catch (err: any) {
      setError(err.message || 'Failed to complete job')
      return false
    } finally {
      setLoading(false)
    }
  }, [userId])

  const updateLocation = useCallback((lat: number, lng: number) => {
    setWorkerLocation({ lat, lng })
  }, [])

  return {
    rankedJobs,
    incomeStats,
    loading,
    error,
    workerSkills,
    workerLocation,
    findAndRankJobs,
    loadIncomeStats,
    acceptJob,
    completeJob,
    updateLocation,
  }
}
