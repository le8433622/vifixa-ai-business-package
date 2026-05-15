'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

export default function AdminPayments() {
  const [stats, setStats] = useState({ total: 0, succeeded: 0, failed: 0, revenue: 0, pending: 0 })
  const [intents, setIntents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: intentsData } = await supabase
      .from('payment_intents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (intentsData) {
      setIntents(intentsData)
      setStats({
        total: intentsData.length,
        succeeded: intentsData.filter(i => i.status === 'succeeded').length,
        failed: intentsData.filter(i => i.status === 'failed').length,
        revenue: intentsData.filter(i => i.status === 'succeeded').reduce((s: number, i: any) => s + Number(i.amount), 0),
        pending: intentsData.filter(i => i.status === 'pending').length,
      })
    }
    setLoading(false)
  }

  const filtered = filter === 'all' ? intents : intents.filter(i => i.status === filter)

  if (loading) return <div className="flex justify-center py-20 bg-gray-900"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-5">
      <h1 className="text-2xl font-bold text-gray-100">💳 Payments</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Tổng GD', value: stats.total, color: 'text-blue-400', bg: 'bg-blue-900/30' },
          { label: 'Thành công', value: stats.succeeded, color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
          { label: 'Thất bại', value: stats.failed, color: 'text-rose-400', bg: 'bg-rose-900/30' },
          { label: 'Chờ xử lý', value: stats.pending, color: 'text-amber-400', bg: 'bg-amber-900/30' },
          { label: 'Doanh thu', value: `${(stats.revenue / 1000000).toFixed(1)}M`, color: 'text-violet-400', bg: 'bg-violet-900/30' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'pending', 'succeeded', 'failed', 'refunded'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === s ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-gray-300">
          <thead>
            <tr className="border-b border-gray-700 text-gray-500 text-left">
              <th className="py-3 px-4">ID</th>
              <th className="py-3 px-4">Gateway</th>
              <th className="py-3 px-4">Số tiền</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Order</th>
              <th className="py-3 px-4">Ngày</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((pi: any) => (
              <tr key={pi.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="py-3 px-4 font-mono text-xs text-gray-500">{pi.id.slice(0, 8)}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    pi.gateway === 'stripe' ? 'bg-purple-900/50 text-purple-300' : 'bg-blue-900/50 text-blue-300'
                  }`}>{pi.gateway}</span>
                </td>
                <td className="py-3 px-4 font-bold">{Number(pi.amount).toLocaleString()}₫</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    pi.status === 'succeeded' ? 'bg-emerald-900/50 text-emerald-300'
                    : pi.status === 'failed' ? 'bg-rose-900/50 text-rose-300'
                    : pi.status === 'pending' ? 'bg-amber-900/50 text-amber-300'
                    : 'bg-gray-700 text-gray-400'
                  }`}>{pi.status}</span>
                </td>
                <td className="py-3 px-4 text-xs text-gray-500">{pi.order_id?.slice(0, 8) || '—'}</td>
                <td className="py-3 px-4 text-gray-500">{new Date(pi.created_at).toLocaleDateString('vi-VN')}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-500">Chưa có giao dịch nào</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
