'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-900/50 text-amber-300',
  resolved: 'bg-emerald-900/50 text-emerald-300',
  rejected: 'bg-gray-700 text-gray-400',
}

export default function AdminDisputes() {
  const router = useRouter()
  const [disputes, setDisputes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('complaints')
      .select('*, orders:order_id(category, estimated_price, status, customer_id, worker_id)')
      .order('created_at', { ascending: false })
    setDisputes(data || [])
    setLoading(false)
  }

  const filtered = filter === 'all' ? disputes : disputes.filter((d: any) => d.status === filter)
  const stats = {
    pending: disputes.filter((d: any) => d.status === 'pending').length,
    resolved: disputes.filter((d: any) => d.status === 'resolved').length,
    total: disputes.length,
  }

  if (loading) return <div className="flex justify-center py-20 bg-gray-900"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">⚖️ Disputes</h1>
        <div className="flex gap-3 text-sm text-gray-400">
          <span>Pending: <strong className="text-amber-400">{stats.pending}</strong></span>
          <span>Resolved: <strong className="text-emerald-400">{stats.resolved}</strong></span>
          <span>Total: <strong className="text-gray-300">{stats.total}</strong></span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['pending', 'resolved', 'rejected', 'all'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === s ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {s === 'all' ? 'Tất cả' : s}
          </button>
        ))}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Chờ xử lý', value: stats.pending, color: 'text-amber-400', bg: 'bg-amber-900/30' },
          { label: 'Đã giải quyết', value: stats.resolved, color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
          { label: 'Tổng số', value: stats.total, color: 'text-blue-400', bg: 'bg-blue-900/30' },
          { label: 'Tỷ lệ giải quyết', value: stats.total > 0 ? `${Math.round(stats.resolved / stats.total * 100)}%` : '—', color: 'text-violet-400', bg: 'bg-violet-900/30' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Disputes table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-gray-300">
          <thead>
            <tr className="border-b border-gray-700 text-gray-500 text-left">
              <th className="py-3 px-4">ID</th>
              <th className="py-3 px-4">Dịch vụ</th>
              <th className="py-3 px-4">Khách hàng</th>
              <th className="py-3 px-4">Lý do</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Ngày</th>
              <th className="py-3 px-4">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-500">Chưa có dispute nào</td></tr>
            ) : (
              filtered.map((d: any) => (
                <tr key={d.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-3 px-4 font-mono text-xs text-gray-500">{d.id.slice(0, 8)}</td>
                  <td className="py-3 px-4">{d.orders?.category || '—'}</td>
                  <td className="py-3 px-4 text-xs">{d.customer_id?.slice(0, 8) || '—'}</td>
                  <td className="py-3 px-4 max-w-[200px] truncate">{d.complaint_type || d.description?.slice(0, 50)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[d.status] || 'bg-gray-700'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{new Date(d.created_at).toLocaleDateString('vi-VN')}</td>
                  <td className="py-3 px-4">
                    <button onClick={() => router.push(`/admin/disputes/${d.id}`)}
                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition">
                      Xử lý →
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
