'use client'

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface DailyBrief {
  date: string
  newUsers: number
  newWorkers: number
  newOrders: number
  completedOrders: number
  revenue: number
  pendingDisputes: number
  pendingKyc: number
  flaggedTransactions: number
  topCategory: string
  insights: string[]
}

export interface KycApplication {
  id: string
  user_id: string
  full_name: string
  phone: string
  id_number: string
  id_front_url: string
  id_back_url: string
  selfie_url: string
  status: string
  created_at: string
  ai_score?: number
  ai_reasons?: string[]
}

export interface FraudAlert {
  id: string
  user_id: string
  alert_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  created_at: string
  resolved: boolean
}

export function useAdminAutoMode(userId: string) {
  const [dailyBrief, setDailyBrief] = useState<DailyBrief | null>(null)
  const [pendingKyc, setPendingKyc] = useState<KycApplication[]>([])
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      loadDailyBrief()
      loadPendingKyc()
      loadFraudAlerts()
    }
  }, [userId])

  async function loadDailyBrief() {
    if (!userId) return

    try {
      setLoading(true)
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

      const [usersRes, workersRes, ordersRes, disputesRes, kycRes] = await Promise.all([
        supabase.from('profiles').select('id, created_at').gte('created_at', todayStart),
        supabase.from('workers').select('id, created_at').gte('created_at', todayStart),
        supabase.from('orders').select('status, estimated_price, final_price, category, created_at').gte('created_at', todayStart),
        supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('kyc_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ])

      const orders = (ordersRes.data || []) as any[]
      const completed = orders.filter(o => o.status === 'completed')
      const revenue = completed.reduce((s, o) => s + (o.final_price || o.estimated_price || 0), 0)

      const categoryCount: Record<string, number> = {}
      orders.forEach(o => { categoryCount[o.category] = (categoryCount[o.category] || 0) + 1 })
      const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

      const insights: string[] = []
      const userCount = (usersRes.data || []).length
      const workerCount = (workersRes.data || []).length
      if (userCount > 5) insights.push(`📈 Tăng ${userCount} người dùng mới hôm nay`)
      if (workerCount > 3) insights.push(`🔧 Tăng ${workerCount} thợ mới hôm nay`)
      if (completed.length > 10) insights.push(`✅ ${completed.length} đơn hoàn thành — hiệu suất tốt`)
      if ((disputesRes as any)?.count > 0) insights.push(`⚠️ ${(disputesRes as any).count} khiếu nại chưa xử lý`)

      setDailyBrief({
        date: todayStart,
        newUsers: userCount,
        newWorkers: workerCount,
        newOrders: orders.length,
        completedOrders: completed.length,
        revenue,
        pendingDisputes: (disputesRes as any)?.count || 0,
        pendingKyc: (kycRes as any)?.count || 0,
        flaggedTransactions: 0,
        topCategory,
        insights,
      })
    } catch (err: any) {
      console.error('Failed to load daily brief:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadPendingKyc() {
    try {
      const { data, error } = await supabase
        .from('kyc_applications')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setPendingKyc(data || [])
    } catch (err: any) {
      console.error('Failed to load pending KYC:', err)
    }
  }

  async function loadFraudAlerts() {
    try {
      const { data, error } = await supabase
        .from('fraud_alerts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setFraudAlerts(data || [])
    } catch (err: any) {
      console.error('Failed to load fraud alerts:', err)
    }
  }

  const approveKyc = useCallback(async (kycId: string, aiScore?: number) => {
    if (!userId) return false

    try {
      setLoading(true)

      const { data: kyc } = await supabase
        .from('kyc_applications')
        .select('user_id')
        .eq('id', kycId)
        .single()

      if (!kyc) throw new Error('KYC not found')

      const { error } = await supabase
        .from('kyc_applications')
        .update({
          status: 'approved',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          ai_score: aiScore,
        })
        .eq('id', kycId)

      if (error) throw error

      await supabase
        .from('profiles')
        .update({ phone_verified: true })
        .eq('id', kyc.user_id)

      await loadPendingKyc()
      return true
    } catch (err: any) {
      setError(err.message || 'Failed to approve KYC')
      return false
    } finally {
      setLoading(false)
    }
  }, [userId])

  const rejectKyc = useCallback(async (kycId: string, reason: string) => {
    if (!userId) return false

    try {
      setLoading(true)

      const { error } = await supabase
        .from('kyc_applications')
        .update({
          status: 'rejected',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', kycId)

      if (error) throw error
      await loadPendingKyc()
      return true
    } catch (err: any) {
      setError(err.message || 'Failed to reject KYC')
      return false
    } finally {
      setLoading(false)
    }
  }, [userId])

  const resolveFraudAlert = useCallback(async (alertId: string) => {
    if (!userId) return false

    try {
      const { error } = await supabase
        .from('fraud_alerts')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId)

      if (error) throw error
      await loadFraudAlerts()
      return true
    } catch (err: any) {
      setError(err.message || 'Failed to resolve alert')
      return false
    }
  }, [userId])

  return {
    dailyBrief,
    pendingKyc,
    fraudAlerts,
    loading,
    error,
    loadDailyBrief,
    loadPendingKyc,
    loadFraudAlerts,
    approveKyc,
    rejectKyc,
    resolveFraudAlert,
  }
}
