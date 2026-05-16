'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export type AppState = 'chat' | 'quoting' | 'tracking' | 'payment' | 'completed'
export type WorkerState = 'idle' | 'chatting' | 'on_job' | 'completed'
export type AdminState = 'idle' | 'analysing' | 'alert' | 'oversight'

type OrderRow = {
  id: string
  customer_id: string
  worker_id: string | null
  status: string
  payment_status: string
  category: string
  description: string
  estimated_price: number
  final_price: number | null
  created_at: string
}

interface AutoModeContext {
  activeOrders: OrderRow[]
  completedOrders: OrderRow[]
  unpaidOrder: OrderRow | null
  trackingOrder: OrderRow | null
  pendingDisputes: number
}

export function useAutoMode(userId: string, role: 'customer' | 'worker' | 'admin') {
  const [appState, setAppState] = useState<AppState | WorkerState | AdminState>(
    role === 'customer' ? 'chat' : role === 'worker' ? 'idle' : 'idle'
  )
  const [context, setContext] = useState<AutoModeContext>({
    activeOrders: [], completedOrders: [], unpaidOrder: null, trackingOrder: null, pendingDisputes: 0,
  })
  const [loading, setLoading] = useState(true)
  const prevStateRef = useRef<string>('')

  const deriveState = useCallback((orders: OrderRow[], disputes: number): AppState | WorkerState | AdminState => {
    const active = orders.filter(o => ['pending', 'matched', 'in_progress'].includes(o.status))
    const completed = orders.filter(o => o.status === 'completed')
    const unpaid = completed.find(o => o.payment_status === 'unpaid')
    const tracking = active.find(o => o.status === 'in_progress')

    setContext({ activeOrders: active, completedOrders: completed, unpaidOrder: unpaid || null, trackingOrder: tracking || null, pendingDisputes: disputes })

    if (role === 'customer') {
      if (tracking) return 'tracking'
      if (active.find(o => o.status === 'matched')) return 'quoting'
      if (unpaid) return 'payment'
      if (completed.length > 0) return 'completed'
      return 'chat'
    }
    if (role === 'worker') {
      if (tracking) return 'on_job'
      return 'idle'
    }
    if (role === 'admin') {
      if (disputes > 0) return 'alert'
      return 'idle'
    }
    return role === 'customer' ? 'chat' : 'idle'
  }, [role])

  // Initial load
  const load = useCallback(async () => {
    const query = role === 'customer'
      ? supabase.from('orders').select('*').eq('customer_id', userId).order('created_at', { ascending: false })
      : role === 'worker'
      ? supabase.from('orders').select('*').eq('worker_id', userId).order('created_at', { ascending: false })
      : supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100)

    const [ordersRes, disputesRes] = await Promise.all([
      query,
      role === 'admin' ? supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('status', 'pending') : Promise.resolve({ count: 0 }),
    ])

    const orders = (ordersRes.data || []) as OrderRow[]
    const dCount = (disputesRes as any)?.count || 0
    const newState = deriveState(orders, dCount)
    if (newState !== prevStateRef.current) {
      prevStateRef.current = newState as string
      setAppState(newState as any)
    }
    setLoading(false)
  }, [userId, role, deriveState])

  useEffect(() => { if (userId) load() }, [userId, load])

  // Realtime subscriptions
  useEffect(() => {
    if (!userId) return

    let filter: string
    if (role === 'customer') filter = `customer_id=eq.${userId}`
    else if (role === 'worker') filter = `worker_id=eq.${userId}`
    else filter = '' // admin sees all

    const channel = supabase
      .channel(`auto-mode-${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter },
        async () => { await load() }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'complaints' },
        async () => { if (role === 'admin') await load() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, role, load])

  const transition = useCallback((newState: AppState | WorkerState | AdminState) => {
    if (newState !== prevStateRef.current) {
      prevStateRef.current = newState as string
      setAppState(newState as any)
    }
  }, [])

  return { appState, context, loading, transition, refresh: load }
}
