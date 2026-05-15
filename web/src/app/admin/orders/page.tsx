'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Order = { id: string; category: string; status: string; estimated_price: number; customer_id: string; worker_id?: string; created_at: string; payment_status?: string }

export default function AdminOrders() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    setOrders(data as any || [])
    setLoading(false)
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  const stats = {
    total: orders.length,
    revenue: orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.estimated_price || 0), 0),
    pending: orders.filter(o => o.status === 'pending').length,
    disputed: orders.filter(o => o.status === 'disputed').length,
  }

  if (loading) return <div className="flex justify-center py-20 bg-gray-900"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">📋 Orders</h1>
        <div className="flex gap-3 text-sm text-gray-400">
          <span>Tổng: <strong className="text-gray-200">{stats.total}</strong></span>
          <span>Doanh thu: <strong className="text-emerald-400">{stats.revenue.toLocaleString()}₫</strong></span>
          <span>Pending: <strong className="text-amber-400">{stats.pending}</strong></span>
          <span>Disputed: <strong className="text-rose-400">{stats.disputed}</strong></span>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'matched', 'in_progress', 'completed', 'disputed'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === s ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {s === 'all' ? 'Tất cả' : s}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-gray-300">
          <thead>
            <tr className="border-b border-gray-700 text-gray-500 text-left">
              <th className="py-3 px-4">ID</th><th className="py-3 px-4">Dịch vụ</th><th className="py-3 px-4">Status</th><th className="py-3 px-4">Giá</th><th className="py-3 px-4">Thanh toán</th><th className="py-3 px-4">Ngày</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer" onClick={() => router.push(`/customer/orders/${o.id}`)}>
                <td className="py-3 px-4 font-mono text-xs text-gray-500">{o.id.slice(0, 8)}</td>
                <td className="py-3 px-4">{o.category}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    o.status === 'completed' ? 'bg-emerald-900/50 text-emerald-300'
                    : o.status === 'in_progress' ? 'bg-blue-900/50 text-blue-300'
                    : o.status === 'pending' ? 'bg-amber-900/50 text-amber-300'
                    : o.status === 'disputed' ? 'bg-rose-900/50 text-rose-300'
                    : 'bg-gray-700 text-gray-400'
                  }`}>{o.status}</span>
                </td>
                <td className="py-3 px-4">{(o.estimated_price || 0).toLocaleString()}₫</td>
                <td className="py-3 px-4">
                  <span className={`text-xs ${o.payment_status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {o.payment_status || 'unpaid'}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-500">{new Date(o.created_at).toLocaleDateString('vi-VN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
