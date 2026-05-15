'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Order = {
  id: string; category: string; description: string; status: string
  estimated_price: number; customer_id?: string; created_at: string
  location_lat?: number; location_lng?: number
}

const STATUS_ICONS: Record<string, string> = {
  pending: '🆕', matched: '✅', in_progress: '🔧', completed: '✔️', cancelled: '❌',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  matched: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default function WorkerJobs() {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'my'>('pending')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setSessionId(session.user.id)

    const { data } = await supabase
      .from('orders')
      .select('*')
      .or(`status.eq.pending,worker_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  async function acceptJob(orderId: string) {
    if (!sessionId) return
    await supabase.from('orders' as any).update({ worker_id: sessionId, status: 'matched' } as any).eq('id', orderId)
    load()
  }

  const pending = orders.filter(o => o.status === 'pending')
  const myJobs = orders.filter(o => o.status !== 'pending' && (o as any).worker_id === sessionId)

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-5">
      <h1 className="text-2xl font-bold">📋 Việc làm</h1>

      {/* Tab */}
      <div className="flex gap-2">
        <button onClick={() => setTab('pending')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === 'pending' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          🆕 Việc mới {pending.length > 0 && `(${pending.length})`}
        </button>
        <button onClick={() => setTab('my')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === 'my' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          📋 Việc của tôi {myJobs.length > 0 && `(${myJobs.length})`}
        </button>
      </div>

      {tab === 'pending' && (
        pending.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-gray-500">Chưa có việc mới</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(order => (
              <div key={order.id} className="bg-white rounded-xl border p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold capitalize">{order.category}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{order.description}</p>
                  </div>
                  <span className="text-lg font-bold text-emerald-600">{order.estimated_price.toLocaleString()}₫</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => acceptJob(order.id)}
                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition">
                    ✅ Nhận việc
                  </button>
                  <button onClick={() => router.push(`/worker/jobs/${order.id}`)}
                    className="px-4 py-2.5 border rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                    Chi tiết
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'my' && (
        myJobs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-gray-500 mb-4">Bạn chưa nhận việc nào</p>
            <button onClick={() => setTab('pending')} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700">
              🔍 Xem việc mới
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {myJobs.map(order => (
              <button key={order.id} onClick={() => router.push(`/worker/jobs/${order.id}`)}
                className="w-full bg-white rounded-xl border p-4 text-left hover:shadow-md transition">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>{STATUS_ICONS[order.status] || '📋'}</span>
                    <h3 className="font-semibold capitalize">{order.category}</h3>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>{order.status}</span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-1">{order.description}</p>
                <div className="flex justify-between items-center mt-2 text-xs">
                  <span className="font-bold text-emerald-600">{order.estimated_price.toLocaleString()}₫</span>
                  <span className="text-gray-400">{new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
              </button>
            ))}
          </div>
        )
      )}
    </div>
  )
}
