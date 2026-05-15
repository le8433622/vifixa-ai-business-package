'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import WalletDashboard from '@/components/wallet/WalletDashboard'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

type Order = { id: string; category: string; estimated_price: number; final_price?: number; status: string; created_at: string; completed_at?: string }

export default function WorkerEarnings() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [statFilter, setStatFilter] = useState<'today' | 'week' | 'month' | 'all'>('today')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setUserId(session.user.id)

    const { data } = await supabase.from('orders').select('*').eq('worker_id', session.user.id).order('created_at', { ascending: false })
    setOrders((data || []) as Order[])
    setLoading(false)
  }

  const completed = orders.filter(o => o.status === 'completed')
  const inProgress = orders.filter(o => o.status === 'in_progress')
  const totalEarned = completed.reduce((s, o) => s + (o.final_price || o.estimated_price || 0), 0)

  const now = Date.now()
  const filtered = completed.filter(o => {
    const d = new Date(o.completed_at || o.created_at).getTime()
    if (statFilter === 'today') return d >= now - 86400000
    if (statFilter === 'week') return d >= now - 7 * 86400000
    if (statFilter === 'month') return d >= now - 30 * 86400000
    return true
  })

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💰 Thu nhập</h1>
          <p className="text-sm text-gray-500">Tổng tất cả: <strong className="text-emerald-600">{totalEarned.toLocaleString()}₫</strong></p>
        </div>
      </div>

      {/* Wallet Dashboard (4 wallets) */}
      <WalletDashboard userId={userId} role="worker" />

      {/* Stats */}
      <div className="flex gap-2">
        {(['today', 'week', 'month', 'all'] as const).map(f => (
          <button key={f} onClick={() => setStatFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              statFilter === f ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {f === 'today' ? 'Hôm nay' : f === 'week' ? 'Tuần này' : f === 'month' ? 'Tháng này' : 'Tất cả'}
          </button>
        ))}
      </div>

      {/* Earnings timeline */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Lịch sử thu nhập</h2>
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border">
            <p className="text-4xl mb-3">💰</p>
            <p className="text-gray-500">Chưa có thu nhập trong kỳ này</p>
          </div>
        ) : (
          filtered.slice(0, 20).map(o => (
            <div key={o.id} className="bg-white rounded-xl border p-4 flex items-center justify-between hover:shadow-md transition cursor-pointer"
              onClick={() => router.push(`/worker/jobs/${o.id}`)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-lg">✅</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 capitalize">{o.category}</p>
                  <p className="text-xs text-gray-500">{new Date(o.completed_at || o.created_at).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-600">+{(o.final_price || o.estimated_price || 0).toLocaleString()}₫</p>
                <p className="text-xs text-gray-400">Đã thanh toán</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
